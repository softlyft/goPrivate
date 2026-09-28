import { customSchemeUrl, extractHandle } from '@goprivate/config';
import * as Linking from 'expo-linking';
import { webChatUrl } from './public-url';
import { extractSessionId } from './session-link';

export function parseDeepLink(url: string): {
  sessionId: string | null;
  handle: string | null;
  path: string;
} {
  const sessionId = extractSessionId(url);
  if (sessionId) {
    return { sessionId, handle: null, path: `/chat/${sessionId}` };
  }
  const handle = extractHandle(url);
  if (handle) {
    return { sessionId: null, handle, path: `/${handle}` };
  }
  return { sessionId: null, handle: null, path: '/' };
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
    custom: customSchemeUrl(sessionId),
  };
}

export function isValidGoPrivateLink(url: string): boolean {
  return extractSessionId(url) !== null || extractHandle(url) !== null;
}
