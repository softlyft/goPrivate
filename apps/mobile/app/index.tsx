import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Image, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PinPad } from '../components/PinPad';
import { ConversationList } from '../components/ConversationList';
import { messageVault } from '../services/vault';
import { startHostChat } from '../services/chat-hub';
import { listChats, useSessionStore } from '../store/session';
import { Colors } from '../constants/Colors';
import { chatHref } from '../utils/session-link';

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const setVaultMeta = useSessionStore((s) => s.setVaultMeta);
  const setVaultReady = useSessionStore((s) => s.setVaultReady);
  const chats = useSessionStore((s) => listChats(s.chats));

  async function openHostChat() {
    const sessionId = await startHostChat();
    router.push(chatHref(sessionId));
  }

  async function handleStartConversation() {
    if (messageVault.isUnlocked) {
      setIsCreating(true);
      setPinError(null);
      try {
        await openHostChat();
      } catch (err) {
        setPinError(err instanceof Error ? err.message : 'Failed to start conversation');
      } finally {
        setIsCreating(false);
      }
      return;
    }
    setShowPinSetup(true);
  }

  async function handlePinSetup(pin: string) {
    if (isCreating) return;
    setIsCreating(true);
    setPinError(null);

    try {
      const meta = await messageVault.setup(pin);
      setVaultMeta(meta);
      setVaultReady(true);
      setShowPinSetup(false);
      await openHostChat();
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Failed to set up PIN');
      await messageVault.clearVault();
    } finally {
      setIsCreating(false);
    }
  }

  function handleJoinWithLink() {
    router.push('/join');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Image
            source={require('../assets/images/logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              <Text style={styles.titleGreen}>go</Text>
              <Text style={styles.titleDark}>Private</Text>
            </Text>
            <Text style={styles.tagline}>Private conversations. No trace.</Text>
          </View>
          <Text style={styles.subtitle}>
            Ephemeral 1:1 chats that vanish in 30 minutes. Run several conversations at once.
          </Text>
        </View>

        <View style={styles.actions}>
          <ConversationList chats={chats} onOpen={(id) => router.push(chatHref(id))} />
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            onPress={handleStartConversation}
            disabled={isCreating}
          >
            <Text style={styles.primaryButtonText}>
              {isCreating ? 'Starting…' : 'Start Private Conversation'}
            </Text>
          </Pressable>
          {pinError && !showPinSetup ? <Text style={styles.homeError}>{pinError}</Text> : null}

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
        <View style={[styles.modalOverlay, isTablet && styles.modalOverlayTablet]}>
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
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
            {isCreating && <Text style={styles.creatingText}>Setting up…</Text>}
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
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 24,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: Colors.brandDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 4,
  },
  titleGreen: {
    color: Colors.brandGreen,
  },
  titleDark: {
    color: Colors.brandDark,
  },
  tagline: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  actions: {
    gap: 16,
  },
  primaryButton: {
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
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: Colors.backgroundWhite,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  secondaryButtonText: {
    color: Colors.primary,
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
    color: Colors.textMuted,
    textAlign: 'center',
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
  creatingText: {
    textAlign: 'center',
    marginTop: 16,
    color: Colors.textMuted,
    fontSize: 14,
  },
  homeError: {
    textAlign: 'center',
    color: Colors.error,
    fontSize: 13,
  },
});
