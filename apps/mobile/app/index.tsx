import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.tagline}>Ephemeral · Encrypted</Text>
        <Text style={styles.title}>goPrivate</Text>
        <Text style={styles.subtitle}>
          Private chat that vanishes when you leave.{'\n'}
          No accounts. No history. End-to-end encrypted.
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push('/chat/create')}
        >
          <Text style={styles.primaryButtonText}>Start Private Conversation</Text>
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR JOIN</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push('/join')}
        >
          <Text style={styles.secondaryButtonText}>Join with Link</Text>
        </Pressable>

        <Text style={styles.hint}>
          Set a 6-digit PIN to reveal older masked messages on your device.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F4FE',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagline: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#6B7280',
    marginBottom: 12,
  },
  title: {
    fontSize: 48,
    fontWeight: '600',
    letterSpacing: -2,
    color: '#111827',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 9999,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 9999,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.5,
    color: '#9CA3AF',
    paddingHorizontal: 12,
  },
  hint: {
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 24,
  },
});
