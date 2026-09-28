import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { ChatRecord } from '../store/session';
import { Colors } from '../constants/Colors';

function shortId(sessionId: string): string {
  return sessionId.slice(0, 8);
}

function remainingLabel(expiresAt: number | null): string | null {
  if (!expiresAt) return null;
  const ms = expiresAt - Date.now();
  if (ms <= 0) return 'Ending';
  const mins = Math.max(1, Math.ceil(ms / 60_000));
  return `${mins} min left`;
}

function statusLabel(chat: ChatRecord): string {
  if (chat.status === 'ready') return 'Encrypted';
  if (chat.status === 'awaiting_partner') return 'Waiting for partner';
  if (chat.status === 'expired') return 'Ended';
  if (chat.status === 'error') return 'Error';
  return remainingLabel(chat.expiresAt) ?? 'Connecting';
}

export function ConversationList({
  chats,
  onOpen,
  emptyText,
}: {
  chats: ChatRecord[];
  onOpen: (sessionId: string) => void;
  emptyText?: string;
}) {
  if (chats.length === 0) {
    if (!emptyText) return null;
    return <Text style={styles.empty}>{emptyText}</Text>;
  }

  return (
    <View style={styles.wrap}>
      {chats.map((chat) => (
        <Pressable
          key={chat.sessionId}
          onPress={() => onOpen(chat.sessionId)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.rowText}>
            <Text style={styles.id}>{shortId(chat.sessionId)}…</Text>
            <Text style={styles.meta}>{statusLabel(chat)}</Text>
          </View>
          {chat.unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{chat.unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 8,
  },
  empty: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundWhite,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  rowText: {
    flex: 1,
    paddingRight: 12,
  },
  id: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
    color: Colors.brandDark,
  },
  meta: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: Colors.backgroundWhite,
    fontSize: 11,
    fontWeight: '700',
  },
});
