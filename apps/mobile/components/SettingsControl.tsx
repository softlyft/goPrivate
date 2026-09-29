import { pinLengthLabel } from '@goprivate/config';
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, Switch } from 'react-native';
import { PinPad } from './PinPad';
import { messageVault } from '../services/vault';
import { useSessionStore } from '../store/session';
import { useDeviceSettings } from '../hooks/use-device-settings';
import { saveDeviceSettings } from '../services/device-settings';
import { Colors } from '../constants/Colors';

type PinStep = 'closed' | 'set' | 'verify-current' | 'set-new';

export function SettingsControl() {
  const setVaultMeta = useSessionStore((s) => s.setVaultMeta);
  const setVaultReady = useSessionStore((s) => s.setVaultReady);
  const settings = useDeviceSettings();
  const [open, setOpen] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [pinStep, setPinStep] = useState<PinStep>('closed');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  function handleOpen(): void {
    setHasPin(messageVault.hasVault);
    setOpen(true);
  }

  function handleClose(): void {
    setOpen(false);
    setPinStep('closed');
    setPinError(null);
  }

  function closePin(): void {
    setPinStep('closed');
    setPinError(null);
  }

  async function handleSetPin(pin: string): Promise<void> {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const meta = await messageVault.setup(pin);
      setVaultMeta(meta);
      setVaultReady(true);
      setHasPin(true);
      closePin();
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Could not save PIN');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleVerifyCurrent(pin: string): Promise<void> {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const ok = await messageVault.verifyPin(pin);
      if (!ok) {
        throw new Error('Incorrect PIN');
      }
      setPinError(null);
      setPinStep('set-new');
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Incorrect PIN');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSetNew(pin: string): Promise<void> {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const meta = await messageVault.rewrap(pin);
      setVaultMeta(meta);
      setVaultReady(true);
      setHasPin(true);
      closePin();
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Could not update PIN');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <>
      <Pressable
        onPress={handleOpen}
        style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
        hitSlop={12}
      >
        <Text style={styles.settingsIcon}>⚙️</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={handleClose}>
        <View style={styles.modalOverlay}>
          {pinStep !== 'closed' ? (
            <View style={styles.pinContainer}>
              <PinPad
                title={
                  pinStep === 'verify-current'
                    ? 'Current PIN'
                    : pinStep === 'set-new'
                      ? 'New PIN'
                      : `Set ${pinLengthLabel()} PIN`
                }
                subtitle={
                  pinStep === 'verify-current'
                    ? 'Enter your current PIN to change it.'
                    : 'This PIN stays on this device. You will not be asked to set it again to start a chat.'
                }
                mode={pinStep === 'verify-current' ? 'verify' : 'setup'}
                externalError={pinError}
                onComplete={(pin) => {
                  if (pinStep === 'verify-current') void handleVerifyCurrent(pin);
                  else if (pinStep === 'set-new') void handleSetNew(pin);
                  else void handleSetPin(pin);
                }}
                onCancel={closePin}
              />
              {isProcessing && <Text style={styles.processingText}>Processing…</Text>}
            </View>
          ) : (
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalKicker}>SETTINGS</Text>
                  <Text style={styles.modalTitle}>This device</Text>
                </View>
                <Pressable onPress={handleClose} hitSlop={12}>
                  <Text style={styles.doneButton}>Done</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.scrollView}>
                <View style={styles.settingsSection}>
                  <View style={styles.settingCard}>
                    <View style={styles.settingContent}>
                      <Text style={styles.settingTitle}>{pinLengthLabel()} PIN</Text>
                      <Text style={styles.settingDescription}>
                        {hasPin
                          ? 'Saved on this device. Used to encrypt local messages.'
                          : 'Set once. Required before you start or join a chat.'}
                      </Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.settingButton, pressed && styles.pressed]}
                      onPress={() => {
                        setPinError(null);
                        setPinStep(hasPin ? 'verify-current' : 'set');
                      }}
                    >
                      <Text style={styles.settingButtonText}>{hasPin ? 'Change' : 'Set'}</Text>
                    </Pressable>
                  </View>

                  <View style={styles.settingCard}>
                    <View style={styles.settingContent}>
                      <Text style={styles.settingTitle}>Scramble messages</Text>
                      <Text style={styles.settingDescription}>
                        Hide older chat text on screen. Turn off to keep messages readable.
                      </Text>
                    </View>
                    <Switch
                      value={settings.scrambleMessages}
                      onValueChange={(value) =>
                        void saveDeviceSettings({ scrambleMessages: value })
                      }
                      trackColor={{ false: 'rgba(0, 0, 0, 0.15)', true: Colors.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 20,
  },
  pressed: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  pinContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  modalKicker: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.brandDark,
  },
  doneButton: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  settingsSection: {
    gap: 16,
  },
  settingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brandDark,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textMuted,
  },
  settingButton: {
    backgroundColor: Colors.backgroundWhite,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.brandDark,
  },
  processingText: {
    textAlign: 'center',
    marginTop: 16,
    color: Colors.textMuted,
    fontSize: 14,
  },
});
