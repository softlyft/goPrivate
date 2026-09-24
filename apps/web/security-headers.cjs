/**
 * Security headers for Next.js config.
 * Kept as CommonJS so `next.config.ts` can require it after Next compiles the config.
 */

function getCSPDirectives(isDevelopment = false) {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com",
    "font-src 'self' data:",
    isDevelopment
      ? "connect-src 'self' ws://localhost:* wss://localhost:* https:"
      : "connect-src 'self' wss://*.vercel.app wss://*.render.com wss://*.onrender.com https://www.google-analytics.com https://www.googletagmanager.com https://analytics.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'none'",
    'upgrade-insecure-requests',
  ];

  return directives.join('; ');
}

function getSecurityHeaders(isDevelopment = false) {
  return [
    {
      key: 'Content-Security-Policy',
      value: getCSPDirectives(isDevelopment),
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block',
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    },
    ...(isDevelopment
      ? []
      : [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ]),
  ];
}

module.exports = { getCSPDirectives, getSecurityHeaders };
