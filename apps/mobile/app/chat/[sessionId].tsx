import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Clipboard,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ConnectionStatus } from '@goprivate/sdk';
import { MessageList } from '../../components/MessageList';
import { MessageComposer } from '../../components/MessageComposer';
import { ShareButton } from '../../components/ShareButton';
import { PinPad } from '../../components/PinPad';
import { messageVault } from '../../services/vault';
import { ensureChat, getChatHub } from '../../services/chat-hub';
import { useSessionStore } from '../../store/session';
import { Colors } from '../../constants/Colors';
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

  const chat = useSessionStore((s) => (sessionId ? s.chats[sessionId] : undefined));
  const vaultReadyStore = useSessionStore((s) => s.vaultReady);
  const setVaultMeta = useSessionStore((s) => s.setVaultMeta);
  const setVaultReady = useSessionStore((s) => s.setVaultReady);

  const [copied, setCopied] = useState(false);
  const [endedByLeave, setEndedByLeave] = useState(false);
  const [vaultReady, setLocalVaultReady] = useState(vaultReadyStore && messageVault.isUnlocked);
  const [pinError, setPinError] = useState<string | null>(null);
  const [remainingText, setRemainingText] = useState<string | null>(null);

  const status = chat?.status ?? 'connecting';
  const error = chat?.error ?? null;
  const expiresAt = chat?.expiresAt ?? null;
  const messages = chat?.messages ?? [];
  const localFingerprint = chat?.localFingerprint ?? null;
  const peerFingerprint = chat?.peerFingerprint ?? null;
  const isReady = status === 'ready';
  const conversationEnded = status === 'expired' || endedByLeave;
  const canShare = Boolean(sessionId) && !conversationEnded && status !== 'ready';

  useEffect(() => {
    setEndedByLeave(false);
    if (sessionId) {
      useSessionStore.getState().setActiveSessionId(sessionId);
    }
    return () => {
      const store = useSessionStore.getState();
      if (store.activeSessionId === sessionId) {
        store.setActiveSessionId(null);
      }
    };
  }, [sessionId]);

  useEffect(() => {
    if (!expiresAt) {
      setRemainingText(null);
      return;
    }
    const tick = () => {
      const ms = expiresAt - Date.now();
      if (ms <= 0) {
        setRemainingText('Ending now');
        return;
      }
      const mins = Math.ceil(ms / 60_000);
      setRemainingText(`${mins} min left`);
    };
    tick();
    const timer = setInterval(tick, 15_000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  useEffect(() => {
    if (!sessionId || !vaultReady) return;

    let cancelled = false;
    void ensureChat(sessionId, isHost).catch((err) => {
      if (cancelled) return;
      useSessionStore.getState().upsertChat(sessionId, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to start session',
      });
    });

    return () => {
      cancelled = true;
    };
  }, [sessionId, vaultReady, isHost]);

  async function handlePinSetup(pin: string) {
    setPinError(null);
    try {
      const meta = await messageVault.setup(pin);
      setVaultMeta(meta);
      setVaultReady(true);
      setLocalVaultReady(true);
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Failed to set up PIN');
      await messageVault.clearVault();
    }
  }

  async function handleSend(text: string) {
    if (!sessionId || !isReady) {
      throw new Error('Not connected');
    }
    if (!messageVault.isUnlocked) {
      throw new Error('Vault is locked');
    }
    await getChatHub().sendMessage(sessionId, text);
  }

  function handleCopyLink() {
    if (!sessionId) return;
    const links = createDeepLink(sessionId);
    Clipboard.setString(`${links.https}\n${links.custom}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleLeave() {
    if (sessionId) {
      await getChatHub().leaveSession(sessionId);
    }
    setEndedByLeave(true);
    const remaining = Object.keys(useSessionStore.getState().chats);
    if (remaining.length > 0) {
      router.replace('/chats');
    }
  }

  async function handleRetry() {
    if (!sessionId) return;
    useSessionStore.getState().upsertChat(sessionId, { error: null });
    try {
      await getChatHub().reconnect(sessionId);
    } catch (err) {
      useSessionStore.getState().upsertChat(sessionId, {
        error: err instanceof Error ? err.message : 'Failed to reconnect',
      });
    }
  }

  function handleBack() {
    router.replace('/chats');
  }

  useEffect(() => {
    if (!vaultReady) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/chats');
      return true;
    });
    return () => sub.remove();
  }, [router, vaultReady]);

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
          onPress={() => router.replace('/chats')}
        >
          <Text style={styles.homeButtonText}>Back to conversations</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
            onPress={handleBack}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
          <View style={styles.topBarText}>
            <Text style={styles.statusText}>{statusLabel(status)}</Text>
            {remainingText ? <Text style={styles.timerText}>{remainingText}</Text> : null}
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
              Share this link with one person. Start more 1:1 chats from Open conversations.
              Sessions end after 30 minutes or when everyone leaves.
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
    paddingHorizontal: 8,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 4,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
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
