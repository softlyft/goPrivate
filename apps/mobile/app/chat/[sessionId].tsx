import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, AppState } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { IRelayClient } from '@goprivate/sdk';
import { MessageList } from '../../components/MessageList';
import { MessageComposer } from '../../components/MessageComposer';
import { messageVault } from '../../services/vault';
import { useSessionStore } from '../../store/session';
import { Colors } from '../../constants/Colors';
import { getRelayClient, ensureConnected } from '../../hooks/use-relay-client';

export default function ChatScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const [client, setClient] = useState<IRelayClient | null>(null);
  const [status, setStatus] = useState<string>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const messages = useSessionStore((s) => s.messages);
  const addMessage = useSessionStore((s) => s.addMessage);
  const isReady = status === 'ready';
  const vaultReady = messageVault.isUnlocked;

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      return;
    }

    const relayClient = getRelayClient();
    let joinTimeout: ReturnType<typeof setTimeout> | null = null;
    let mounted = true;

    console.log('[ChatScreen] Setting up relay client for session:', sessionId);

    const onStatus = (newStatus: string) => {
      if (!mounted) return;
      console.log('[ChatScreen] Status changed:', newStatus);
      setStatus(newStatus);
      if (newStatus === 'ready') {
        setIsJoining(false);
        if (joinTimeout) {
          clearTimeout(joinTimeout);
          joinTimeout = null;
        }
      }
    };

    const onError = (_code: string, message: string) => {
      if (!mounted) return;
      console.error('[ChatScreen] Error:', _code, message);
      setError(message);
      setIsJoining(false);
      if (joinTimeout) {
        clearTimeout(joinTimeout);
        joinTimeout = null;
      }
      Alert.alert('Connection Error', message);
    };

    const onMessage = async (msg: {
      id: string;
      text: string;
      timestamp: number;
      fromPeer: boolean;
    }) => {
      if (!mounted) return;
      if (!messageVault.isUnlocked) {
        console.warn('[ChatScreen] Received message but vault is locked');
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
        console.error('[ChatScreen] Failed to store message:', err);
      }
    };

    relayClient.on('status', onStatus);
    relayClient.on('error', onError);
    relayClient.on('message', onMessage);

    setClient(relayClient);

    async function connectAndJoin() {
      try {
        console.log('[ChatScreen] Ensuring connection...');
        await ensureConnected();

        if (!mounted) return;

        console.log('[ChatScreen] Joining session:', sessionId);
        setIsJoining(true);

        // Set a 30-second timeout for joining
        joinTimeout = setTimeout(() => {
          if (!mounted) return;
          if (status !== 'ready') {
            console.warn('[ChatScreen] Join timeout');
            setError('Session not found or host is offline');
            setIsJoining(false);
            Alert.alert(
              'Unable to Join',
              'The session may have expired or the host is not online yet. Please ask them to share a new link.',
              [{ text: 'Go Back', onPress: () => router.back() }],
            );
          }
        }, 30000);

        await relayClient.joinSession(sessionId);

        if (!mounted) return;

        console.log('[ChatScreen] Successfully joined session');
        setIsJoining(false);
        if (joinTimeout) {
          clearTimeout(joinTimeout);
          joinTimeout = null;
        }
      } catch (err) {
        if (!mounted) return;

        console.error('[ChatScreen] Failed to join session:', err);
        setIsJoining(false);
        if (joinTimeout) {
          clearTimeout(joinTimeout);
          joinTimeout = null;
        }
        const message = err instanceof Error ? err.message : 'Failed to join session';
        setError(message);
        Alert.alert(
          'Connection Failed',
          message.includes('SESSION_NOT_FOUND')
            ? 'This session does not exist or has expired.'
            : message,
          [{ text: 'Go Back', onPress: () => router.back() }],
        );
      }
    }

    void connectAndJoin();

    return () => {
      mounted = false;
      console.log('[ChatScreen] Cleaning up...');
      if (joinTimeout) {
        clearTimeout(joinTimeout);
      }
      relayClient.off('status', onStatus);
      relayClient.off('error', onError);
      relayClient.off('message', onMessage);
      // Don't disconnect - keep the singleton alive for reconnection
    };
  }, [sessionId, addMessage, router, status]);

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
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.statusText}>
          {status === 'connecting' && 'Connecting to relay...'}
          {status === 'connected' && isJoining && 'Waiting for host...'}
          {status === 'handshaking' && 'Establishing secure channel...'}
          {status === 'disconnected' && 'Disconnected'}
        </Text>
        {status === 'connected' && isJoining && (
          <Text style={styles.hintText}>
            The person who created this session needs to be online
          </Text>
        )}
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
  hintText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
});
