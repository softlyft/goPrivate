import * as Linking from 'expo-linking';
import { webChatUrl } from './public-url';
import { extractSessionId } from './session-link';

export function parseDeepLink(url: string): { sessionId: string | null; path: string } {
  const sessionId = extractSessionId(url);
  if (sessionId) {
    return { sessionId, path: `/chat/${sessionId}` };
  }
  return { sessionId: null, path: '/' };
}

export async function getInitialURL(): Promise<string | null> {
  try {
    return await Linking.getInitialURL();
  } catch (error) {
    console.error('Error getting initial URL:', error);
    return null;
  }
}

export function createDeepLink(sessionId: string): {
  https: string;
  custom: string;
} {
  return {
    https: webChatUrl(sessionId),
    custom: `goprivate://chat/${sessionId}`,
  };
}

export function isValidGoPrivateLink(url: string): boolean {
  return extractSessionId(url) !== null;
}
