import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  AppState,
  Pressable,
  Clipboard,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ConnectionStatus, IRelayClient } from '@goprivate/sdk';
import { createMobileRelayClient } from '../../utils/relay';
import { MessageList } from '../../components/MessageList';
import { MessageComposer } from '../../components/MessageComposer';
import { ShareButton } from '../../components/ShareButton';
import { PinPad } from '../../components/PinPad';
import { messageVault } from '../../services/vault';
import { useSessionStore } from '../../store/session';
import { Colors } from '../../constants/Colors';
import { getRelayUrl } from '../../utils/env';
import { createDeepLink } from '../../utils/deeplink';

function paramValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function statusLabel(status: ConnectionStatus): string {
  switch (status) {
    case 'connecting':
    case 'connected':
      return 'Connecting to relay…';
    case 'awaiting_partner':
      return 'Waiting for your contact to join';
    case 'handshaking':
      return 'Establishing secure channel…';
    case 'ready':
      return 'Secure channel ready';
    case 'disconnected':
      return 'Reconnecting…';
    case 'error':
      return 'Connection error';
    case 'expired':
      return 'Session ended';
    default:
      return status;
  }
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ sessionId: string; host?: string }>();
  const sessionId = paramValue(params.sessionId);
  const isHost = paramValue(params.host) === '1';
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [client, setClient] = useState<IRelayClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remainingLabel, setRemainingLabel] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [endedByLeave, setEndedByLeave] = useState(false);
  const [vaultReady, setVaultReady] = useState(messageVault.isUnlocked);
  const [pinError, setPinError] = useState<string | null>(null);
  const [localFingerprint, setLocalFingerprint] = useState<string | null>(null);
  const [peerFingerprint, setPeerFingerprint] = useState<string | null>(null);

  const messages = useSessionStore((s) => s.messages);
  const addMessage = useSessionStore((s) => s.addMessage);
  const clearMessages = useSessionStore((s) => s.clearMessages);
  const setVaultMeta = useSessionStore((s) => s.setVaultMeta);

  const isReady = status === 'ready';
  const conversationEnded = status === 'expired' || endedByLeave;
  const canShare = Boolean(sessionId) && !conversationEnded && status !== 'ready';

  useEffect(() => {
    if (!expiresAt) {
      setRemainingLabel(null);
      return;
    }
    const tick = () => {
      const ms = expiresAt - Date.now();
      if (ms <= 0) {
        setRemainingLabel('Ending now');
        return;
      }
      const mins = Math.ceil(ms / 60_000);
      setRemainingLabel(`${mins} min left`);
    };
    tick();
    const timer = setInterval(tick, 15_000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  useEffect(() => {
    if (!sessionId || !vaultReady) {
      return;
    }

    const relayClient = createMobileRelayClient();

    relayClient.on('status', (next) => {
      setStatus(next);
      if (next === 'awaiting_partner') {
        setLocalFingerprint(null);
        setPeerFingerprint(null);
      }
      if (next !== 'error') {
        setError(null);
      }
    });

    relayClient.on('sessionCreated', (_id, nextExpiresAt) => {
      setExpiresAt(nextExpiresAt);
    });

    relayClient.on('partnerJoined', (nextExpiresAt) => {
      setExpiresAt(nextExpiresAt);
    });

    relayClient.on('sessionExpired', () => {
      clearMessages();
      void messageVault.lock();
      setStatus('expired');
    });

    relayClient.on('fingerprintsReady', (local, peer) => {
      setLocalFingerprint(local);
      setPeerFingerprint(peer);
    });

    relayClient.on('error', (_code, message) => {
      setError(message);
    });

    relayClient.on('message', async (msg) => {
      if (!messageVault.isUnlocked) {
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
        setError(err instanceof Error ? err.message : 'Failed to store message');
      }
    });

    setClient(relayClient);

    void relayClient
      .connect(getRelayUrl())
      .then(async () => {
        if (isHost) {
          await relayClient.createSession(sessionId);
        } else {
          await relayClient.joinSession(sessionId);
        }
        if (relayClient.expiresAt) {
          setExpiresAt(relayClient.expiresAt);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to start session');
      });

    return () => {
      void relayClient.disconnect();
    };
  }, [sessionId, vaultReady, isHost, addMessage, clearMessages]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && client && status === 'disconnected') {
        void client.reconnect().catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to reconnect');
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [client, status]);

  async function handlePinSetup(pin: string) {
    setPinError(null);
    try {
      const meta = await messageVault.setup(pin);
      setVaultMeta(meta);
      setVaultReady(true);
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Failed to set up PIN');
      await messageVault.clearVault();
    }
  }

  async function handleSend(text: string) {
    if (!client || !isReady) {
      throw new Error('Not connected');
    }

    if (!messageVault.isUnlocked) {
      throw new Error('Vault is locked');
    }

    await client.sendMessage(text);
  }

  function handleCopyLink() {
    if (!sessionId) return;
    const links = createDeepLink(sessionId);
    Clipboard.setString(`${links.https}\n${links.custom}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function endConversation(leaveRelay: boolean) {
    if (leaveRelay) {
      await client?.leaveSession();
    }
    clearMessages();
    await messageVault.lock();
    setEndedByLeave(true);
  }

  async function handleLeave() {
    await endConversation(true);
  }

  async function handleRetry() {
    if (!client) return;
    setError(null);
    try {
      await client.reconnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reconnect');
    }
  }

  if (!sessionId) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>No session ID provided</Text>
      </SafeAreaView>
    );
  }

  if (!vaultReady) {
    return (
      <SafeAreaView style={[styles.pinOverlay, isTablet && styles.pinOverlayTablet]}>
        <View style={[styles.pinCard, isTablet && styles.pinCardTablet]}>
          <PinPad
            title="Set your reveal PIN"
            subtitle="Choose a 6-digit PIN to protect your messages"
            mode="setup"
            externalError={pinError}
            onComplete={(pin) => void handlePinSetup(pin)}
            onCancel={() => router.replace('/')}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (conversationEnded) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.endedTitle}>Conversation destroyed.</Text>
        <Text style={styles.endedBody}>No messages stored. No account created.</Text>
        <Pressable
          style={({ pressed }) => [styles.homeButton, pressed && styles.buttonPressed]}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.homeButtonText}>Back home</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <View style={styles.topBarText}>
            <Text style={styles.statusText}>{statusLabel(status)}</Text>
            {remainingLabel ? <Text style={styles.timerText}>{remainingLabel}</Text> : null}
          </View>
          <Pressable
            style={({ pressed }) => [styles.leaveButton, pressed && styles.buttonPressed]}
            onPress={() => void handleLeave()}
          >
            <Text style={styles.leaveButtonText}>Leave</Text>
          </Pressable>
        </View>

        {canShare ? (
          <View style={styles.shareContainer}>
            <View style={styles.shareRow}>
              <ShareButton sessionId={sessionId} onCopyFallback={handleCopyLink} />
              <Pressable
                style={({ pressed }) => [
                  styles.copyButton,
                  pressed && styles.buttonPressed,
                  copied && styles.copyButtonCopied,
                ]}
                onPress={handleCopyLink}
              >
                <Text style={[styles.copyText, copied && styles.copyTextCopied]}>
                  {copied ? 'Copied' : 'Copy Link'}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.shareHint}>
              Share now. Web opens the https link. This app opens goprivate://. Sessions end after
              30 minutes or when everyone leaves.
            </Text>
          </View>
        ) : null}

        {isReady && localFingerprint && peerFingerprint ? (
          <View style={styles.fingerprintBox}>
            <Text style={styles.fingerprintLabel}>Verify fingerprints with your contact</Text>
            <Text style={styles.fingerprintValue}>You: {localFingerprint}</Text>
            <Text style={styles.fingerprintValue}>Them: {peerFingerprint}</Text>
          </View>
        ) : null}

        {error ? (
          <Pressable onPress={() => void handleRetry()}>
            <Text style={styles.errorBanner}>{error} Tap to retry.</Text>
          </Pressable>
        ) : null}

        {!isReady && status !== 'awaiting_partner' ? (
          <View style={styles.waitingRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.waitingText}>{statusLabel(status)}</Text>
          </View>
        ) : null}

        <MessageList messages={messages} vaultReady={vaultReady} />
        <MessageComposer disabled={!isReady || !vaultReady} onSend={handleSend} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: Colors.backgroundWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topBarText: {
    flex: 1,
    paddingRight: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.brandDark,
  },
  timerText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  leaveButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  leaveButtonText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '600',
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundWhite,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  copyButtonCopied: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  copyText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  copyTextCopied: {
    color: Colors.backgroundWhite,
  },
  fingerprintBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.backgroundWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fingerprintLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  fingerprintValue: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: Colors.brandDark,
  },
  errorBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FEECEC',
    color: Colors.error,
    fontSize: 13,
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  waitingText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
  },
  endedTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.brandDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  endedBody: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  homeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  homeButtonText: {
    color: Colors.backgroundWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  pinOverlay: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  pinOverlayTablet: {
    justifyContent: 'center',
    padding: 24,
  },
  pinCard: {
    backgroundColor: Colors.backgroundWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: '100%',
    alignItems: 'center',
  },
  pinCardTablet: {
    maxWidth: 440,
    borderRadius: 24,
  },
});
