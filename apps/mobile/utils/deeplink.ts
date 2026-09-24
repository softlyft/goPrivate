import * as Linking from 'expo-linking';

/**
 * Parse deep link URL and extract session ID
 */
export function parseDeepLink(url: string): { sessionId: string | null; path: string } {
  try {
    const parsed = Linking.parse(url);

    // Handle custom scheme: goprivate://chat/sessionId
    if (parsed.scheme === 'goprivate') {
      const pathParts = parsed.path?.split('/').filter(Boolean) || [];
      if (pathParts[0] === 'chat' && pathParts[1]) {
        return {
          sessionId: pathParts[1],
          path: `/chat/${pathParts[1]}`,
        };
      }
    }

    // Handle HTTPS: https://goprivate.app/chat/sessionId
    if (
      parsed.scheme === 'https' &&
      (parsed.hostname === 'goprivate.app' || parsed.hostname === 'www.goprivate.app')
    ) {
      const pathParts = parsed.path?.split('/').filter(Boolean) || [];
      if (pathParts[0] === 'chat' && pathParts[1]) {
        return {
          sessionId: pathParts[1],
          path: `/chat/${pathParts[1]}`,
        };
      }
    }

    return { sessionId: null, path: '/' };
  } catch (error) {
    console.error('Error parsing deep link:', error);
    return { sessionId: null, path: '/' };
  }
}

/**
 * Get the initial URL when app is opened via deep link
 */
export async function getInitialURL(): Promise<string | null> {
  try {
    const url = await Linking.getInitialURL();
    return url;
  } catch (error) {
    console.error('Error getting initial URL:', error);
    return null;
  }
}

/**
 * Create a deep link URL for a session
 */
export function createDeepLink(sessionId: string): {
  https: string;
  custom: string;
} {
  return {
    https: `https://goprivate.app/chat/${sessionId}`,
    custom: `goprivate://chat/${sessionId}`,
  };
}

/**
 * Check if URL is a valid goPrivate deep link
 */
export function isValidGoPrivateLink(url: string): boolean {
  try {
    const parsed = Linking.parse(url);

    // Check custom scheme
    if (parsed.scheme === 'goprivate') {
      return true;
    }

    // Check HTTPS with goprivate domain
    if (
      parsed.scheme === 'https' &&
      (parsed.hostname === 'goprivate.app' || parsed.hostname === 'www.goprivate.app')
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
