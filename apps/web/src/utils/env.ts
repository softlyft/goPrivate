import { DEFAULT_DEV_RELAY_URL } from '@goprivate/config';

export function getRelayUrl(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_RELAY_URL) {
    return process.env.NEXT_PUBLIC_RELAY_URL;
  }
  return DEFAULT_DEV_RELAY_URL;
}

export function getShareUrl(sessionId: string): string {
  if (typeof window === 'undefined') {
    return `/chat/${sessionId}`;
  }
  return `${window.location.origin}/chat/${sessionId}`;
}

export function getHandleShareUrl(handle: string): string {
  if (typeof window === 'undefined') {
    return `/${handle}`;
  }
  return `${window.location.origin}/${handle}`;
}

export function getHandleClaimSecret(): string | undefined {
  const value =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_HANDLE_CLAIM_SECRET?.trim() : '';
  return value ? value : undefined;
}
