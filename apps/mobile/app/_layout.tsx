import '../polyfills';
import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { parseDeepLink } from '../utils/deeplink';
import { chatHref } from '../utils/session-link';

const STACK_SCREEN_OPTIONS = {
  headerShown: false,
  animation: 'slide_from_right' as const,
};

export default function RootLayout() {
  const router = useRouter();

  // Handle deep links when app is already open
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const { sessionId, handle } = parseDeepLink(url);

      if (sessionId) {
        router.push(chatHref(sessionId));
      } else if (handle) {
        router.push(`/${handle}`);
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
      if (!initialUrl || /expo-development-client/i.test(initialUrl)) {
        return;
      }

      const { sessionId, handle } = parseDeepLink(initialUrl);

      if (sessionId) {
        setTimeout(() => {
          router.push(chatHref(sessionId));
        }, 100);
      } else if (handle) {
        setTimeout(() => {
          router.push(`/${handle}`);
        }, 100);
      }
    }

    void handleInitialURL();
  }, [router]);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={STACK_SCREEN_OPTIONS}>
        <Stack.Screen name="index" />
        <Stack.Screen name="chats" />
        <Stack.Screen name="join" />
        <Stack.Screen name="[handle]" />
        <Stack.Screen name="chat/[sessionId]" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </SafeAreaProvider>
  );
}
