import { PUBLIC_WEB_ORIGIN, publicChatUrl } from '@goprivate/config';

export { PUBLIC_WEB_ORIGIN };

export function webChatUrl(sessionId: string): string {
  return publicChatUrl(sessionId);
}
