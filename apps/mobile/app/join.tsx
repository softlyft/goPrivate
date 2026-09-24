import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { PinPad } from '../components/PinPad';
import { messageVault } from '../services/vault';
import { useSessionStore } from '../store/session';
import { Colors } from '../constants/Colors';
import { chatHref, extractSessionId } from '../utils/session-link';

export default function JoinScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
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

      const id = extractSessionId(sessionId);
      if (!id) {
        throw new Error('Enter a valid session link or ID');
      }
      setShowPinSetup(false);
      router.push(chatHref(id));
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Failed to set up PIN');
      await messageVault.clearVault();
    }
  }

  function handleTextChange(text: string) {
    setSessionId(extractSessionId(text) ?? text.trim());
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
        <View style={[styles.modalOverlay, isTablet && styles.modalOverlayTablet]}>
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
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
    backgroundColor: Colors.background,
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
    color: Colors.brandDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: Colors.backgroundWhite,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    minHeight: 100,
    textAlignVertical: 'top',
    color: Colors.text,
  },
  joinButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Colors.brandDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: Colors.backgroundWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.brandDark,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
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
