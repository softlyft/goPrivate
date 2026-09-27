import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { StoredMessage } from '../store/session';
import { messageVault } from '../services/vault';
import { sanitizeMessageText } from '../utils/sanitize';
import { Colors } from '../constants/Colors';

export type MaskLevel = 'clear' | 'soft' | 'masked';

const DOUBLE_TAP_MS = 300;
const MASK_PLACEHOLDER = '••••••••••';

function DecryptedBody({ encryptedText, fromPeer }: { encryptedText: string; fromPeer: boolean }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    console.log(
      '[MessageBubble] Decrypting message, encrypted length:',
      encryptedText?.length ?? 0,
    );

    if (!encryptedText) {
      console.error('[MessageBubble] No encrypted text provided!');
      setText('[Empty message]');
      return;
    }

    let cancelled = false;
    setText(null);

    void messageVault
      .decrypt(encryptedText)
      .then((plain) => {
        console.log('[MessageBubble] Decrypted successfully, length:', plain?.length ?? 0);
        if (!cancelled) {
          if (!plain) {
            console.warn('[MessageBubble] Decryption returned empty string');
            setText('[Empty message]');
          } else {
            setText(sanitizeMessageText(plain));
          }
        }
      })
      .catch((err) => {
        console.error('[MessageBubble] Decryption failed:', err);
        if (!cancelled) setText('Unable to decrypt');
      });

    return () => {
      cancelled = true;
      setText(null);
    };
  }, [encryptedText]);

  if (text === null) {
    return <Text style={[styles.loading, fromPeer && styles.loadingPeer]}>…</Text>;
  }

  return <Text style={[styles.messageText, fromPeer && styles.messageTextPeer]}>{text}</Text>;
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
          <DecryptedBody encryptedText={message.encryptedText} fromPeer={message.fromPeer} />
        ) : (
          <Text style={[styles.messageText, message.fromPeer && styles.messageTextPeer]}>
            {MASK_PLACEHOLDER}
          </Text>
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
    backgroundColor: Colors.bubbleSelf,
    borderBottomRightRadius: 4,
    shadowColor: Colors.brandDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
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
    color: Colors.bubbleText,
  },
  messageTextPeer: {
    color: Colors.bubbleTextPeer,
  },
  loading: {
    fontSize: 15,
    lineHeight: 20,
    color: Colors.bubbleText,
    opacity: 0.4,
  },
  loadingPeer: {
    color: Colors.bubbleTextPeer,
  },
});
