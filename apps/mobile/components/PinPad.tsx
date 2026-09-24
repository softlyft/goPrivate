import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'] as const;

interface PinPadProps {
  title: string;
  subtitle?: string;
  confirmLabel?: string;
  onComplete: (pin: string) => void;
  onCancel?: () => void;
  mode?: 'setup' | 'verify';
  externalError?: string | null;
}

export function PinPad({
  title,
  subtitle,
  confirmLabel = 'Continue',
  onComplete,
  onCancel,
  mode = 'setup',
  externalError,
}: PinPadProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const activeValue = step === 'confirm' ? confirmPin : pin;
  const activeSetter = step === 'confirm' ? setConfirmPin : setPin;

  useEffect(() => {
    if (!externalError) return;
    const message = externalError.replace(/\s*\(\d+\)$/, '');
    fail(message);
  }, [externalError]);

  function pushDigit(digit: string) {
    setError(null);
    activeSetter((prev) => (prev.length < 6 ? prev + digit : prev));
  }

  function backspace() {
    setError(null);
    activeSetter((prev) => prev.slice(0, -1));
  }

  function fail(message: string) {
    setError(message);
    setShake(true);
    setTimeout(() => setShake(false), 400);
    if (mode === 'verify') {
      setPin('');
    } else if (step === 'confirm') {
      setConfirmPin('');
    }
  }

  function submit() {
    if (activeValue.length !== 6) return;

    if (mode === 'verify') {
      onComplete(activeValue);
      return;
    }

    if (step === 'enter') {
      setStep('confirm');
      return;
    }

    if (pin !== confirmPin) {
      fail('PINs do not match');
      setStep('enter');
      setPin('');
      setConfirmPin('');
      return;
    }

    onComplete(pin);
  }

  const stepLabel =
    mode === 'verify'
      ? 'Enter your reveal PIN'
      : step === 'enter'
        ? 'Choose a 6-digit PIN'
        : 'Confirm your PIN';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        <Text style={styles.stepLabel}>{stepLabel}</Text>
      </View>

      <View style={[styles.dots, shake && styles.shake]}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < activeValue.length ? styles.dotFilled : styles.dotEmpty,
            ]}
          />
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.keypad}>
        {KEYS.map((key, index) => {
          if (key === '') {
            return <View key={`empty-${index}`} style={styles.key} />;
          }
          if (key === '⌫') {
            return (
              <Pressable
                key={key}
                style={styles.key}
                onPress={backspace}
              >
                <Text style={styles.keyTextSecondary}>⌫</Text>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={key}
              style={[styles.key, styles.keyButton]}
              onPress={() => pushDigit(key)}
            >
              <Text style={styles.keyText}>{key}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.submitButton, activeValue.length !== 6 && styles.submitButtonDisabled]}
          onPress={submit}
          disabled={activeValue.length !== 6}
        >
          <Text style={styles.submitButtonText}>
            {mode === 'verify' ? 'Reveal' : step === 'confirm' ? confirmLabel : 'Next'}
          </Text>
        </Pressable>
        {onCancel && (
          <Pressable onPress={onCancel}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </Pressable>
        )}
      </View>

      {mode === 'setup' && (
        <Text style={styles.hint}>
          This PIN stays on your device only. It is never sent to the relay.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 24,
    maxWidth: 400,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  shake: {
    // Animation would be added with Animated API
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  dotEmpty: {
    borderColor: 'rgba(0, 0, 0, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotFilled: {
    borderColor: '#111827',
    backgroundColor: '#111827',
    transform: [{ scale: 1.1 }],
  },
  error: {
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  key: {
    width: '30%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 16,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '400',
    color: '#111827',
  },
  keyTextSecondary: {
    fontSize: 24,
    color: '#6B7280',
  },
  actions: {
    gap: 12,
  },
  submitButton: {
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 9999,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },
  hint: {
    fontSize: 11,
    lineHeight: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
  },
});
