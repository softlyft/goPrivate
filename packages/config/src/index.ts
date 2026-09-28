/**
 * Private-server / rebrand surface.
 *
 * Change this file (then rebuild packages) to rename the product, restyle it,
 * point it at your relay, and tune session limits. Web, mobile, SDK, and relay
 * all read these values.
 *
 * Still replace by hand:
 * - Logo files: apps/web/public/logo.jpg, apps/mobile/assets/**
 * - Native ids if you do not use apps/mobile/app.config.ts:
 *   app.json name, scheme, bundleIdentifier, package, associatedDomains
 * - Deploy env (overrides the defaults here):
 *   NEXT_PUBLIC_RELAY_URL, EXPO_PUBLIC_RELAY_URL, ALLOWED_ORIGINS,
 *   NEXT_PUBLIC_SUPPORT_URL
 */

/** Shown in the header, share sheets, and metadata. */
export const APP_NAME = 'goPrivate';
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
export const PUBLIC_WEB_ORIGIN = 'https://goprivate.vercel.app';
/** Extra HTTPS origins that may appear on share links / CORS. */
export const PUBLIC_WEB_ORIGINS = [
  PUBLIC_WEB_ORIGIN,
  'https://goprivate.app',
  'https://www.goprivate.app',
] as const;

/** Custom URL scheme for the mobile app (`goprivate://chat/...`). */
export const DEEP_LINK_SCHEME = 'goprivate';

export const IOS_BUNDLE_ID = 'com.goprivate.mobile';
export const ANDROID_PACKAGE = 'com.goprivate.mobile';

export const WEB_LOGO_SRC = '/logo.jpg';

export const DEFAULT_DEV_RELAY_URL = 'ws://localhost:3001/ws';
/** Android emulator loopback to the host machine. */
export const DEFAULT_ANDROID_EMULATOR_RELAY_URL = 'ws://10.0.2.2:3001/ws';
export const DEFAULT_PROD_RELAY_URL = 'wss://goprivate-relay.onrender.com/ws';

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

/** Live 1:1 chats on one device. */
export const MAX_CONCURRENT_CHATS = 5;

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
