/**
 * Private-server / rebrand surface.
 *
 * Change this file (then rebuild packages) to rename the product, restyle it,
 * point it at your relay, and tune session limits. Web, mobile, SDK, and relay
 * all read these values.
 *
 * Native ids consumed by Expo `app.config.ts` live in `native.json` so
 * `expo prebuild` can require them as CommonJS. This file re-exports those
 * values — edit the JSON to rename the app, scheme, package ids, or public
 * origins.
 *
 * Still replace by hand:
 * - Logo files: apps/web/public/logo.jpg, apps/mobile/assets/**
 * - Native ids if you do not use apps/mobile/app.config.ts:
 *   app.json name, scheme, bundleIdentifier, package, associatedDomains
 * - Deploy env (overrides the defaults here):
 *   NEXT_PUBLIC_RELAY_URL, EXPO_PUBLIC_RELAY_URL, ALLOWED_ORIGINS,
 *   NEXT_PUBLIC_SUPPORT_URL, HANDLE_CLAIM_SECRET,
 *   NEXT_PUBLIC_HANDLE_CLAIM_SECRET, EXPO_PUBLIC_HANDLE_CLAIM_SECRET
 */

import native from './native.json';

/** Shown in the header, share sheets, and metadata. */
export const APP_NAME = native.APP_NAME;
/** First colored span of the wordmark. Set to '' for a single-color name. */
export const APP_NAME_LEAD = 'go';
/** Rest of the wordmark. */
export const APP_NAME_REST = 'Private';

export const TAGLINE = 'Private conversations. No trace.';
export const DESCRIPTION = 'Ephemeral end-to-end encrypted messaging. No accounts. No history.';
export const SUBTITLE =
  'Ephemeral 1:1 chat that vanishes when you leave. Run several conversations at once. No accounts.';

export const SUPPORT_URL = 'https://github.com/sponsors/softlyft';
export const SUPPORT_LABEL = `Support ${APP_NAME}`;

/** Public web origin used in share links and CORS defaults. */
export const PUBLIC_WEB_ORIGIN = native.PUBLIC_WEB_ORIGINS[0]!;
/** Extra HTTPS origins that may appear on share links / CORS. */
export const PUBLIC_WEB_ORIGINS = native.PUBLIC_WEB_ORIGINS;

/** Custom URL scheme for the mobile app (`goprivate://chat/...`). */
export const DEEP_LINK_SCHEME = native.DEEP_LINK_SCHEME;

export const IOS_BUNDLE_ID = native.IOS_BUNDLE_ID;
export const ANDROID_PACKAGE = native.ANDROID_PACKAGE;

export const WEB_LOGO_SRC = '/logo.jpg';

export const DEFAULT_DEV_RELAY_URL = 'ws://localhost:3001/ws';
/** Android emulator loopback to the host machine. */
export const DEFAULT_ANDROID_EMULATOR_RELAY_URL = 'ws://10.0.2.2:3001/ws';
export const DEFAULT_PROD_RELAY_URL = native.DEFAULT_PROD_RELAY_URL;

/** Extra WSS hosts allowed in the web CSP connect-src. */
export const CSP_CONNECT_WSS = [
  'wss://*.onrender.com',
  'wss://*.render.com',
  'wss://*.vercel.app',
] as const;

export const COLOR = {
  green: '#169e6b',
  greenLight: '#1fb77f',
  greenDark: '#128558',
  dark: '#1a4d3d',
  darkHover: '#153d30',
  background: '#f4f4f5',
  danger: '#dc2626',
} as const;

/**
 * Lasting /{handle} links are presence mailboxes, not accounts.
 * Empty allowlist = any valid handle may be claimed while the owner is online.
 * Non-empty = only these names (typical private-server setup).
 */
export const HANDLE_ALLOWLIST: string[] = [];

/** `alice`, `olumide-1` — not a reserved app path. */
export const HANDLE_PATTERN = /^[a-z][a-z0-9-]{1,30}$/;

/** App routes that must never resolve as a handle. */
export const RESERVED_PATHS = [
  'chat',
  'chats',
  'guide',
  'about',
  'join',
  'api',
  'login',
  'static',
  'health',
  'ws',
  '_next',
  'favicon.ico',
] as const;

/** Live 1:1 chats on one device without a claimed lasting name. */
export const FREE_MAX_CONCURRENT_CHATS = 3;
/** Live 1:1 chats while a lasting name is claimed (premium). */
export const PREMIUM_MAX_CONCURRENT_CHATS = 7;
/** Absolute ceiling — same as premium / inbound rings on a claimed handle. */
export const MAX_CONCURRENT_CHATS = PREMIUM_MAX_CONCURRENT_CHATS;

export function maxConcurrentChats(premium: boolean): number {
  return premium ? PREMIUM_MAX_CONCURRENT_CHATS : FREE_MAX_CONCURRENT_CHATS;
}

export function concurrentChatLimitError(premium: boolean): string {
  const max = maxConcurrentChats(premium);
  if (premium) {
    return `You can have at most ${max} conversations at once`;
  }
  return `You can have at most ${max} conversations at once. Go available with a lasting name for up to ${PREMIUM_MAX_CONCURRENT_CHATS}.`;
}

export function concurrentChatLimitHint(premium: boolean): string {
  if (premium) {
    return `You can keep up to ${PREMIUM_MAX_CONCURRENT_CHATS} chats open with this name.`;
  }
  return `Up to ${FREE_MAX_CONCURRENT_CHATS} chats at a time. A lasting name allows ${PREMIUM_MAX_CONCURRENT_CHATS}.`;
}

/** Hosted premium lasting-name plan. Paid in USDT. */
export const PREMIUM_PRICE_USDT_MONTHLY = 2;
/** Fraction off 12 months when billed yearly (0.1 = 10%). */
export const PREMIUM_YEARLY_DISCOUNT = 0.1;

export function premiumPriceUsdtYearly(): number {
  return Math.round(PREMIUM_PRICE_USDT_MONTHLY * 12 * (1 - PREMIUM_YEARLY_DISCOUNT) * 100) / 100;
}

export function formatUsdt(amount: number): string {
  const text = Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
  return `${text} USDT`;
}

/** Lasting name used for operator contact on the hosted app. */
export const OPERATOR_CONTACT_HANDLE = 'goprivate';

/**
 * Temporary USDT settlement address for hosted Premium.
 * Replace before accepting live payments.
 */
export const USDT_PAYMENT_ADDRESS = '0x1111111111111111111111111111111111111111';

/** Session lifetime from creation. */
export const SESSION_TTL_MS = 30 * 60 * 1000;

/** Keep an empty session so a backgrounded app can reconnect. */
export const RECONNECT_GRACE_MS = 60_000;

export const PIN_LENGTH = 6;

/** Max CREATE/JOIN/SEND actions per IP per sliding window. */
export const RATE_LIMIT_MAX_ACTIONS = 60;
export const RATE_LIMIT_WINDOW_MS = 60_000;

/** New sessions created from one IP per window. */
export const MAX_SESSIONS_PER_IP = 5;
export const SESSION_CREATION_WINDOW_MS = 60 * 60 * 1000;

/** Max concurrent sessions in the in-memory relay store. */
export const MAX_RELAY_SESSIONS = 500;

/** Max concurrent WebSocket connections on the relay. */
export const MAX_RELAY_CONNECTIONS = 1_000;

export const SESSION_TTL_MINUTES = Math.round(SESSION_TTL_MS / 60_000);

export function sessionTtlLabel(): string {
  return SESSION_TTL_MINUTES === 1 ? '1 minute' : `${SESSION_TTL_MINUTES} minutes`;
}

export function pinLengthLabel(): string {
  return `${PIN_LENGTH}-digit`;
}

export function pinPattern(): RegExp {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`);
}

export function publicWebHost(): string {
  return new URL(PUBLIC_WEB_ORIGIN).host;
}

export function publicChatUrl(sessionId: string): string {
  return `${PUBLIC_WEB_ORIGIN}/chat/${sessionId}`;
}

export function customSchemeUrl(sessionId: string): string {
  return `${DEEP_LINK_SCHEME}://chat/${sessionId}`;
}

export function publicHandleUrl(handle: string): string {
  return `${PUBLIC_WEB_ORIGIN}/${normalizeHandle(handle)}`;
}

export function customSchemeHandleUrl(handle: string): string {
  return `${DEEP_LINK_SCHEME}://${normalizeHandle(handle)}`;
}

export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isReservedPath(slug: string): boolean {
  return (RESERVED_PATHS as readonly string[]).includes(normalizeHandle(slug));
}

/** Pattern + reserved paths only (ignore allowlist). Used for URL routing. */
export function isHandleSlug(raw: string): boolean {
  const handle = normalizeHandle(raw);
  return HANDLE_PATTERN.test(handle) && !isReservedPath(handle);
}

/** Whether this instance will let someone CLAIM the name. */
export function isAllowedHandle(raw: string): boolean {
  const handle = normalizeHandle(raw);
  if (!isHandleSlug(handle)) return false;
  if (HANDLE_ALLOWLIST.length === 0) return true;
  return HANDLE_ALLOWLIST.includes(handle);
}

/**
 * Pull a handle out of a paste or URL. Session `/chat/{hex}` links return null.
 */
export function extractHandle(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);

    if (url.protocol === `${DEEP_LINK_SCHEME}:`) {
      if (url.hostname === 'chat') return null;
      if (url.hostname && isHandleSlug(url.hostname) && parts.length === 0) {
        return normalizeHandle(url.hostname);
      }
      const fromPath = parts[0];
      if (fromPath && isHandleSlug(fromPath) && parts.length === 1) {
        return normalizeHandle(fromPath);
      }
      return null;
    }

    if (parts[0] === 'chat') return null;
    const slug = parts[0];
    if (slug && isHandleSlug(slug) && parts.length === 1) {
      return normalizeHandle(slug);
    }
    return null;
  } catch {
    return isHandleSlug(trimmed) ? normalizeHandle(trimmed) : null;
  }
}

export function inviteShareMessage(urls: { web: string; app: string }): string {
  return `You've been invited to a private conversation on ${APP_NAME}.

Web: ${urls.web}
App: ${urls.app}

This session expires in ${sessionTtlLabel()}.`;
}

export function brandCssVars(): Record<string, string> {
  return {
    '--brand-green': COLOR.green,
    '--brand-green-light': COLOR.greenLight,
    '--brand-green-dark': COLOR.greenDark,
    '--brand-dark': COLOR.dark,
    '--brand-dark-hover': COLOR.darkHover,
    '--foreground': COLOR.dark,
    '--accent': COLOR.green,
    '--success': COLOR.green,
    '--bubble-self': COLOR.green,
    '--background': COLOR.background,
    '--danger': COLOR.danger,
  };
}
