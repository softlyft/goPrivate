import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { StoredMessage } from '../store/session';
import { messageVault } from '../services/vault';
import { sanitizeMessageText } from '../utils/sanitize';

export type MaskLevel = 'clear' | 'soft' | 'masked';

const DOUBLE_TAP_MS = 300;
const MASK_PLACEHOLDER = '••••••••••';

function DecryptedBody({ encryptedText }: { encryptedText: string }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setText(null);

    void messageVault
      .decrypt(encryptedText)
      .then((plain) => {
        if (!cancelled) setText(sanitizeMessageText(plain));
      })
      .catch(() => {
        if (!cancelled) setText('Unable to decrypt');
      });

    return () => {
      cancelled = true;
      setText(null);
    };
  }, [encryptedText]);

  if (text === null) {
    return <Text style={styles.loading}>…</Text>;
  }

  return <Text style={styles.messageText}>{text}</Text>;
}

export function MessageBubble({
  message,
  maskLevel = 'clear',
  revealed = false,
  onRequestReveal,
}: {
  message: StoredMessage;
  maskLevel?: MaskLevel;
  revealed?: boolean;
  onRequestReveal?: () => void;
}) {
  const lastTapRef = useRef(0);
  const effectiveLevel: MaskLevel = revealed ? 'clear' : maskLevel;
  const showPlaintext = effectiveLevel === 'clear';
  const masked = !showPlaintext;

  function handlePress() {
    if (!masked || !onRequestReveal) return;
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      onRequestReveal();
      return;
    }
    lastTapRef.current = now;
  }

  return (
    <View
      style={[styles.container, message.fromPeer ? styles.containerPeer : styles.containerSelf]}
    >
      <Pressable
        disabled={!masked || !onRequestReveal}
        onPress={handlePress}
        style={[
          styles.bubble,
          message.fromPeer ? styles.bubblePeer : styles.bubbleSelf,
          effectiveLevel === 'soft' && styles.bubbleSoft,
          effectiveLevel === 'masked' && styles.bubbleMasked,
        ]}
      >
        {showPlaintext ? (
          <DecryptedBody encryptedText={message.encryptedText} />
        ) : (
          <Text style={styles.messageText}>{MASK_PLACEHOLDER}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  containerPeer: {
    justifyContent: 'flex-start',
  },
  containerSelf: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bubblePeer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  bubbleSelf: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  bubbleSoft: {
    opacity: 0.7,
  },
  bubbleMasked: {
    opacity: 0.45,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#000',
  },
  loading: {
    fontSize: 15,
    lineHeight: 20,
    color: '#000',
    opacity: 0.4,
  },
});
