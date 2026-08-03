export function getRelayUrl(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_RELAY_URL) {
    return process.env.NEXT_PUBLIC_RELAY_URL;
  }
  return 'ws://localhost:3001/ws';
}

export function getShareUrl(sessionId: string): string {
  if (typeof window === 'undefined') {
    return `/chat/${sessionId}`;
  }
  return `${window.location.origin}/chat/${sessionId}`;
}
