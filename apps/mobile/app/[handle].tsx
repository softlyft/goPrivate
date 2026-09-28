import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isHandleSlug, pinLengthLabel, sessionTtlLabel } from '@goprivate/config';
import { PinPad } from '../components/PinPad';
import { Colors } from '../constants/Colors';
import { messageVault } from '../services/vault';
import { startHandleChat } from '../services/chat-hub';
import { useSessionStore } from '../store/session';
import { chatHref } from '../utils/session-link';

function paramValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function errorCopy(error: string): string {
  if (error.includes('HANDLE_UNAVAILABLE')) {
    return 'This person is not online. Lasting links only work while they are connected — there is no voicemail.';
  }
  if (error.includes('HANDLE_BUSY')) {
    return 'This person already has too many conversations open. Try again later.';
  }
  return error;
}

export default function HandleScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const handle = paramValue(useLocalSearchParams<{ handle: string }>().handle).toLowerCase();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const setVaultMeta = useSessionStore((s) => s.setVaultMeta);
  const setVaultReady = useSessionStore((s) => s.setVaultReady);

  async function reach(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const sessionId = await startHandleChat(handle);
      router.replace(chatHref(sessionId, { host: true }));
    } catch (err) {
      setError(errorCopy(err instanceof Error ? err.message : 'Could not reach this person'));
      setBusy(false);
    }
  }

  async function handlePin(pin: string): Promise<void> {
    setPinError(null);
    try {
      const meta = await messageVault.setup(pin);
      setVaultMeta(meta);
      setVaultReady(true);
      setShowPin(false);
      await reach();
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Failed to set up PIN');
      await messageVault.clearVault();
    }
  }

  if (!isHandleSlug(handle)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Invalid name</Text>
          <Pressable onPress={() => router.replace('/')}>
            <Text style={styles.back}>Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
        <Text style={styles.kicker}>Lasting link</Text>
        <Text style={styles.title}>/{handle}</Text>
        <Text style={styles.subtitle}>
          If they are online, this starts a private {sessionTtlLabel()} chat. If they are not,
          nothing is stored.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          disabled={busy}
          onPress={() => {
            if (!messageVault.isUnlocked) {
              setShowPin(true);
              return;
            }
            void reach();
          }}
        >
          <Text style={styles.primaryText}>{busy ? 'Reaching…' : `Reach ${handle}`}</Text>
        </Pressable>
      </View>

      <Modal
        visible={showPin}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPin(false)}
      >
        <View style={[styles.modalOverlay, isTablet && styles.modalOverlayTablet]}>
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
            <PinPad
              title="Set your reveal PIN"
              subtitle={`Choose a ${pinLengthLabel()} PIN to protect your messages`}
              mode="setup"
              externalError={pinError}
              onComplete={(pin) => void handlePin(pin)}
              onCancel={() => setShowPin(false)}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  back: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.brandDark,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
  },
  error: {
    color: Colors.error,
    fontSize: 14,
  },
  primary: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalOverlayTablet: {
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: '50%',
    width: '100%',
    alignItems: 'center',
  },
  modalContentTablet: {
    maxWidth: 440,
    minHeight: undefined,
    borderRadius: 24,
  },
});
