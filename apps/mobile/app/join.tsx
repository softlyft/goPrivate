import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { PinPad } from '../components/PinPad';
import { messageVault } from '../services/vault';
import { useSessionStore } from '../store/session';

export default function JoinScreen() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState('');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const setVaultMeta = useSessionStore((s) => s.setVaultMeta);
  const clearMessages = useSessionStore((s) => s.clearMessages);

  function handleJoin() {
    const trimmedId = sessionId.trim();
    if (!trimmedId) {
      return;
    }

    clearMessages();
    setShowPinSetup(true);
  }

  async function handlePinSetup(pin: string) {
    setPinError(null);
    try {
      const meta = await messageVault.setup(pin);
      setVaultMeta(meta);

      setShowPinSetup(false);
      router.push(`/chat/${sessionId.trim()}`);
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Failed to set up PIN');
      await messageVault.clearVault();
    }
  }

  function extractSessionId(input: string): string {
    const trimmed = input.trim();

    const urlMatch = trimmed.match(/goprivate\.app\/(?:chat\/)?([a-zA-Z0-9_-]+)/);
    if (urlMatch) {
      return urlMatch[1]!;
    }

    const customSchemeMatch = trimmed.match(/goprivate:\/\/(?:chat\/)?([a-zA-Z0-9_-]+)/);
    if (customSchemeMatch) {
      return customSchemeMatch[1]!;
    }

    return trimmed;
  }

  function handleTextChange(text: string) {
    const extracted = extractSessionId(text);
    setSessionId(extracted);
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Join Session</Text>
          <Text style={styles.subtitle}>Paste the session link or ID shared by your contact</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            value={sessionId}
            onChangeText={handleTextChange}
            placeholder="Paste session link or ID"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            multiline
            numberOfLines={3}
          />

          <Pressable
            style={({ pressed }) => [
              styles.joinButton,
              !sessionId.trim() && styles.joinButtonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleJoin}
            disabled={!sessionId.trim()}
          >
            <Text style={styles.joinButtonText}>Continue</Text>
          </Pressable>
        </View>

        <View style={styles.info}>
          <Text style={styles.infoTitle}>Accepted formats:</Text>
          <Text style={styles.infoText}>
            • Full URL: https://goprivate.app/chat/abc123{'\n'}• Custom scheme:
            goprivate://chat/abc123{'\n'}• Session ID only: abc123
          </Text>
        </View>
      </View>

      <Modal
        visible={showPinSetup}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowPinSetup(false);
          setPinError(null);
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
                setShowPinSetup(false);
                setPinError(null);
              }}
            />
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
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#8E8E93',
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  joinButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  info: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#8E8E93',
    fontFamily: 'monospace',
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
});
