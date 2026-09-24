import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Modal, Pressable } from 'react-native';
import { MessageBubble, type MaskLevel } from './MessageBubble';
import { PinPad } from './PinPad';
import { messageVault } from '../services/vault';
import type { StoredMessage } from '../store/session';

const CLEAR_COUNT = 1;
const SOFT_COUNT = 1;
const REVEAL_MS = 8_000;

function maskLevelFor(index: number, total: number): MaskLevel {
  const fromEnd = total - 1 - index;
  if (fromEnd < CLEAR_COUNT) return 'clear';
  if (fromEnd < CLEAR_COUNT + SOFT_COUNT) return 'soft';
  return 'masked';
}

export function MessageList({
  messages,
  vaultReady,
}: {
  messages: StoredMessage[];
  vaultReady: boolean;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [pendingRevealId, setPendingRevealId] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      for (const timer of activeTimers.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  function revealMessage(messageId: string) {
    setRevealedIds((prev) => new Set(prev).add(messageId));
    const existing = timers.current.get(messageId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      setRevealedIds((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
      timers.current.delete(messageId);
    }, REVEAL_MS);

    timers.current.set(messageId, timer);
  }

  async function handlePinSuccess(pin: string) {
    try {
      const ok = await messageVault.verifyPin(pin);
      if (!ok) {
        setPinError('Incorrect PIN');
        return;
      }
      setPinError(null);
      if (pendingRevealId) {
        revealMessage(pendingRevealId);
      }
      setPendingRevealId(null);
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'PIN check failed');
    }
  }

  if (messages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Messages appear here once the channel is ready.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {messages.map((message, index) => {
          const level = maskLevelFor(index, messages.length);
          const revealed = revealedIds.has(message.id);
          return (
            <MessageBubble
              key={message.id}
              message={message}
              maskLevel={level}
              revealed={revealed}
              onRequestReveal={
                level !== 'clear' && vaultReady
                  ? () => {
                      setPinError(null);
                      setPendingRevealId(message.id);
                    }
                  : undefined
              }
            />
          );
        })}
      </ScrollView>

      <Modal
        visible={!!pendingRevealId && vaultReady}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPendingRevealId(null);
          setPinError(null);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setPendingRevealId(null);
            setPinError(null);
          }}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <PinPad
              title="Reveal message"
              subtitle="Enter your reveal PIN to decrypt this message temporarily."
              mode="verify"
              externalError={pinError}
              onComplete={(pin) => void handlePinSuccess(pin)}
              onCancel={() => {
                setPendingRevealId(null);
                setPinError(null);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
});
