import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConversationList } from '../components/ConversationList';
import { listChats, useSessionStore } from '../store/session';
import { Colors } from '../constants/Colors';
import { chatHref } from '../utils/session-link';

export default function ChatsScreen() {
  const router = useRouter();
  const chats = useSessionStore((s) => listChats(s.chats));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/')} hitSlop={12}>
          <Text style={styles.homeLink}>Home</Text>
        </Pressable>
        <Text style={styles.kicker}>Inbox</Text>
        <Text style={styles.title}>Open conversations</Text>
        <Text style={styles.subtitle}>
          Each chat is still 1:1. Leave one without closing the others.
        </Text>
      </View>

      <View style={styles.list}>
        <ConversationList
          chats={chats}
          emptyText="No open conversations yet. Start one, or join a link from home."
          onOpen={(id) => {
            const chat = chats.find((item) => item.sessionId === id);
            router.push(chatHref(id, { host: chat?.isHost }));
          }}
        />
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={() => router.push('/')}
        >
          <Text style={styles.primaryButtonText}>Start a new conversation</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          onPress={() => router.push('/join')}
        >
          <Text style={styles.secondaryButtonText}>Join with link</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 8,
    marginBottom: 20,
  },
  homeLink: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 16,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.brandDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  list: {
    flex: 1,
  },
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.backgroundWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: Colors.backgroundWhite,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
