import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function JoinScreen() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState('');

  const handleJoin = () => {
    if (sessionId.trim()) {
      router.push(`/chat/${sessionId.trim()}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Join Session</Text>
        <Text style={styles.subtitle}>Paste the session link or ID you received</Text>

        <TextInput
          style={styles.input}
          placeholder="Session ID or link"
          placeholderTextColor="#9CA3AF"
          value={sessionId}
          onChangeText={setSessionId}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />

        <Pressable
          style={[styles.button, !sessionId.trim() && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={!sessionId.trim()}
        >
          <Text style={styles.buttonText}>Join</Text>
        </Pressable>

        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Back to Home</Text>
        </Pressable>
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
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: -1,
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: '#6B7280',
    marginBottom: 32,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  backLink: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
    textDecorationLine: 'underline',
  },
});
