import { extractHandle } from '@goprivate/config';
import { extractSessionId } from '../utils/session-link';

/** Rewrite inbound https / goprivate:// links to the file route before Expo matches them. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
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
