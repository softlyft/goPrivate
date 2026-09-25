/** Production web client. Share links must match the deployed Next.js host. */
export const PUBLIC_WEB_ORIGIN = 'https://goprivate.vercel.app';

export function webChatUrl(sessionId: string): string {
  return `${PUBLIC_WEB_ORIGIN}/chat/${sessionId}`;
}
