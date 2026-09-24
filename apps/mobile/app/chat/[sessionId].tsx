import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  Clipboard,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { IRelayClient } from '@goprivate/sdk';
import { createMobileRelayClient } from '../../utils/relay';
import { MessageList } from '../../components/MessageList';
import { MessageComposer } from '../../components/MessageComposer';
import { ShareButton } from '../../components/ShareButton';
import { messageVault } from '../../services/vault';
import { useSessionStore } from '../../store/session';
import { Colors } from '../../constants/Colors';
import { getRelayUrl } from '../../utils/env';

export default function ChatScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const [client, setClient] = useState<IRelayClient | null>(null);
  const [status, setStatus] = useState<string>('connecting');
  const [error, setError] = useState<string | null>(null);

  const messages = useSessionStore((s) => s.messages);
  const addMessage = useSessionStore((s) => s.addMessage);
  const [copied, setCopied] = useState(false);
  const isReady = status === 'ready';
  const vaultReady = messageVault.isUnlocked;

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      return;
    }

    const relayClient = createMobileRelayClient();

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

  function handleCopyLink() {
    if (!sessionId) return;
    const shareUrl = `https://goprivate.app/chat/${sessionId}`;
    Clipboard.setString(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      {isReady && sessionId && (
        <View style={styles.shareContainer}>
          <View style={styles.shareRow}>
            <ShareButton sessionId={sessionId} onCopyFallback={handleCopyLink} />
            <Pressable
              style={({ pressed }) => [
                styles.copyButton,
                pressed && styles.copyButtonPressed,
                copied && styles.copyButtonCopied,
              ]}
              onPress={handleCopyLink}
            >
              <Text style={styles.copyIcon}>{copied ? '✓' : '📋'}</Text>
              <Text style={[styles.copyText, copied && styles.copyTextCopied]}>
                {copied ? 'Copied!' : 'Copy Link'}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.shareHint}>
            Share this link with your contact to start a secure conversation
          </Text>
        </View>
      )}
      <MessageList messages={messages} vaultReady={vaultReady} />
      <MessageComposer disabled={!isReady || !vaultReady} onSend={handleSend} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  shareContainer: {
    backgroundColor: Colors.backgroundWhite,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  shareRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  shareHint: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
  },
  copyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.backgroundWhite,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  copyButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  copyButtonCopied: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  copyIcon: {
    fontSize: 18,
  },
  copyText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  copyTextCopied: {
    color: Colors.backgroundWhite,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
  statusText: {
    fontSize: 16,
    color: Colors.textMuted,
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
  },
});
