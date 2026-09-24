import { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MAX_CHAT_TEXT_CHARS } from '@goprivate/protocol';
import { sanitizeMessageText } from '../utils/sanitize';

export function MessageComposer({
  disabled,
  onSend,
}: {
  disabled?: boolean;
  onSend: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  async function handleSend() {
    const value = sanitizeMessageText(text.trim());
    if (!value || disabled || sending) return;
    if (value.length > MAX_CHAT_TEXT_CHARS) {
      setLocalError(`Max ${MAX_CHAT_TEXT_CHARS} characters`);
      return;
    }

    setSending(true);
    setLocalError(null);
    setText('');

    try {
      await onSend(value);
    } catch (err) {
      setText(value);
      setLocalError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={styles.container}>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={(value) => {
              setText(value.slice(0, MAX_CHAT_TEXT_CHARS));
              setLocalError(null);
            }}
            placeholder={disabled ? 'Waiting for secure channel…' : 'Type a message'}
            editable={!disabled}
            maxLength={MAX_CHAT_TEXT_CHARS}
            autoComplete="off"
            autoCorrect
            autoCapitalize="sentences"
            style={styles.input}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <Pressable
            disabled={disabled || sending || !text.trim()}
            onPress={handleSend}
            style={({ pressed }) => [
              styles.sendButton,
              (disabled || sending || !text.trim()) && styles.sendButtonDisabled,
              pressed && styles.sendButtonPressed,
            ]}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </Pressable>
        </View>
        {localError && <Text style={styles.error}>{localError}</Text>}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    fontSize: 15,
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  sendButtonPressed: {
    opacity: 0.8,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  error: {
    fontSize: 11,
    color: '#FF3B30',
    marginTop: 8,
    paddingHorizontal: 4,
  },
});
