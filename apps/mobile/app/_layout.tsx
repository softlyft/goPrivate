import '../polyfills';
import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { parseDeepLink } from '../utils/deeplink';
import { chatHref } from '../utils/session-link';

export default function RootLayout() {
  const router = useRouter();

  // Handle deep links when app is already open
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const { sessionId } = parseDeepLink(url);

      if (sessionId) {
        router.push(chatHref(sessionId));
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  // Handle initial deep link when app is opened from closed state
  useEffect(() => {
    async function handleInitialURL() {
      const initialUrl = await Linking.getInitialURL();

      if (initialUrl) {
        const { sessionId } = parseDeepLink(initialUrl);

        if (sessionId) {
          setTimeout(() => {
            router.push(chatHref(sessionId));
          }, 100);
        }
      }
    }

    handleInitialURL();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="join" />
        <Stack.Screen name="chat/[sessionId]" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </SafeAreaProvider>
  );
}
