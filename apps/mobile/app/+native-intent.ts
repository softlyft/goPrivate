import { extractHandle } from '@goprivate/config';
import { extractSessionId } from '../utils/session-link';

function isExpoDevClientPath(path: string): boolean {
  return /expo-development-client/i.test(path);
}

/** Rewrite inbound https / goprivate:// links to the file route before Expo matches them. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  // `expo run:android` launches via goprivate://expo-development-client/?url=...
  // That must not be treated as a lasting-link handle.
  if (isExpoDevClientPath(path)) {
    return '/';
  }
  const sessionId = extractSessionId(path);
  if (sessionId) {
    return `/chat/${sessionId}`;
  }
  const handle = extractHandle(path);
  if (handle) {
    return `/${handle}`;
  }
  return path;
}
