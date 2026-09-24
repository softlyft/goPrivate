import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { createRelayClient } from '@goprivate/sdk';
import { PinPad } from '../components/PinPad';
import { messageVault } from '../services/vault';
import { useSessionStore } from '../store/session';

const RELAY_URL = __DEV__ ? 'ws://10.0.2.2:8080' : 'wss://relay.goprivate.app';

export default function HomeScreen() {
  const router = useRouter();
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const setVaultMeta = useSessionStore((s) => s.setVaultMeta);
  const clearMessages = useSessionStore((s) => s.clearMessages);

  async function handleStartConversation() {
    clearMessages();
    setShowPinSetup(true);
  }

  async function handlePinSetup(pin: string) {
    if (isCreating) return;
    setIsCreating(true);
    setPinError(null);

    try {
      const meta = await messageVault.setup(pin);
      setVaultMeta(meta);

      const client = createRelayClient();

      const sessionId = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 30000);

        client.on('sessionCreated', (sid) => {
          clearTimeout(timeout);
          resolve(sid);
        });

        client.on('error', (_code, message) => {
          clearTimeout(timeout);
          reject(new Error(message));
        });

        void client.createSession();
      });

      await client.disconnect();

      setShowPinSetup(false);
      router.push(`/chat/${sessionId}`);
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Failed to create session');
      await messageVault.clearVault();
    } finally {
      setIsCreating(false);
    }
  }

  function handleJoinWithLink() {
    router.push('/join');
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>goPrivate</Text>
          <Text style={styles.subtitle}>
            Ephemeral, end-to-end encrypted conversations that vanish in 5 minutes.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            onPress={handleStartConversation}
            disabled={isCreating}
          >
            <Text style={styles.primaryButtonText}>Start Private Conversation</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            onPress={handleJoinWithLink}
          >
            <Text style={styles.secondaryButtonText}>Join with Link</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            • No account required{'\n'}• Messages encrypted on your device{'\n'}• Sessions expire
            automatically{'\n'}• Secure 6-digit PIN protection
          </Text>
        </View>
      </View>

      <Modal
        visible={showPinSetup}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!isCreating) {
            setShowPinSetup(false);
            setPinError(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <PinPad
              title="Set your reveal PIN"
              subtitle="Choose a 6-digit PIN to protect your messages"
              mode="setup"
              externalError={pinError}
              onComplete={(pin) => void handlePinSetup(pin)}
              onCancel={() => {
                if (!isCreating) {
                  setShowPinSetup(false);
                  setPinError(null);
                }
              }}
            />
            {isCreating && <Text style={styles.creatingText}>Creating session...</Text>}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  actions: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    lineHeight: 24,
    color: '#8E8E93',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: '50%',
  },
  creatingText: {
    textAlign: 'center',
    marginTop: 16,
    color: '#8E8E93',
    fontSize: 14,
  },
});
