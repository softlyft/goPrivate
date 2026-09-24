import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, AppState } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createRelayClient, type IRelayClient } from '@goprivate/sdk';
import { MessageList } from '../../components/MessageList';
import { MessageComposer } from '../../components/MessageComposer';
import { messageVault } from '../../services/vault';
import { useSessionStore } from '../../store/session';
import { getRelayUrl } from '../../utils/env';

export default function ChatScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const [client, setClient] = useState<IRelayClient | null>(null);
  const [status, setStatus] = useState<string>('connecting');
  const [error, setError] = useState<string | null>(null);

  const messages = useSessionStore((s) => s.messages);
  const addMessage = useSessionStore((s) => s.addMessage);
  const isReady = status === 'ready';
  const vaultReady = messageVault.isUnlocked;

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      return;
    }

    const relayClient = createRelayClient();

    relayClient.on('status', (newStatus) => {
      setStatus(newStatus);
    });

    relayClient.on('error', (_code, message) => {
      setError(message);
      Alert.alert('Connection Error', message);
    });

    relayClient.on('message', async (msg) => {
      if (!messageVault.isUnlocked) {
        console.warn('Received message but vault is locked');
        return;
      }

      try {
        const encrypted = await messageVault.encrypt(msg.text);
        addMessage({
          id: msg.id,
          encryptedText: encrypted,
          fromPeer: msg.fromPeer,
          timestamp: msg.timestamp,
        });
      } catch (err) {
        console.error('Failed to store message:', err);
      }
    });

    setClient(relayClient);

    void relayClient.connect(getRelayUrl()).then(() => relayClient.joinSession(sessionId));

    return () => {
      void relayClient.disconnect();
    };
  }, [sessionId, addMessage]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && client && status === 'disconnected') {
        void client.reconnect();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [client, status, sessionId]);

  async function handleSend(text: string) {
    if (!client || !isReady) {
      throw new Error('Not connected');
    }

    if (!messageVault.isUnlocked) {
      throw new Error('Vault is locked');
    }

    await client.sendMessage(text);

    const encrypted = await messageVault.encrypt(text);
    addMessage({
      id: `msg-${Date.now()}-${Math.random()}`,
      encryptedText: encrypted,
      fromPeer: false,
      timestamp: Date.now(),
    });
  }

  if (error && !client) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>❌ {error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.statusText}>
          {status === 'connecting' && 'Connecting to relay...'}
          {status === 'handshaking' && 'Establishing secure channel...'}
          {status === 'disconnected' && 'Disconnected'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MessageList messages={messages} vaultReady={vaultReady} />
      <MessageComposer disabled={!isReady || !vaultReady} onSend={handleSend} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 20,
  },
  statusText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
});
