import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function ChatScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Chat Session</Text>
        <Text style={styles.sessionId}>Session: {sessionId}</Text>
        <Text style={styles.placeholder}>
          Phase 1: Foundation Setup{'\n\n'}
          Next steps:{'\n'}
          • Implement PIN pad{'\n'}
          • Port Zustand stores{'\n'}
          • Add WebSocket connection{'\n'}
          • Implement vault
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
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sessionId: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#6B7280',
    marginBottom: 24,
  },
  placeholder: {
    fontSize: 14,
    lineHeight: 24,
    color: '#6B7280',
    textAlign: 'center',
  },
});
