const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;
const LAN_ORIGIN = /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+$/;

const DEFAULT_ORIGINS = [
  'https://goprivate.vercel.app',
  'https://goprivate.app',
  'https://www.goprivate.app',
];

export function isAllowedOrigin(
  origin: string | undefined,
  options: { allowedOrigins?: string; nodeEnv?: string } = {},
): boolean {
  if (!origin) return true;

  const configured = (options.allowedOrigins ?? process.env.ALLOWED_ORIGINS)
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const allowList = configured && configured.length > 0 ? configured : DEFAULT_ORIGINS;
  if (allowList.includes(origin)) return true;

  // Local browsers talking to a hosted relay (documented Local + Render setup)
  if (LOCAL_ORIGIN.test(origin)) return true;

  const env = options.nodeEnv ?? process.env.NODE_ENV;
  if (env !== 'production' && LAN_ORIGIN.test(origin)) return true;

  return false;
}
