/**
 * Content Security Policy (CSP) configuration for goPrivate.
 *
 * CSP provides defense-in-depth against XSS attacks by controlling which
 * resources the browser is allowed to load and execute.
 *
 * Current limitations:
 * - Next.js requires 'unsafe-inline' for React hydration scripts
 * - Next.js requires 'unsafe-eval' in development mode
 * - Production CSS inlining requires 'unsafe-inline' for styles
 *
 * Future improvements:
 * - Implement nonce-based CSP for stricter script-src policy
 * - Use hash-based CSP for specific inline styles
 * - Consider migrating to strict CSP once Next.js supports it better
 */

/**
 * Get CSP directives based on environment.
 * Allows localhost WebSocket in development, restricts to known domains in production.
 */
export function getCSPDirectives(isDevelopment = false): string {
  const directives = [
    "default-src 'self'",

    // Scripts: Next.js requires unsafe-inline and unsafe-eval
    // Analytics scripts are explicitly allowed
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",

    // Styles: Next.js inlines critical CSS
    "style-src 'self' 'unsafe-inline'",

    // Images: Allow data URIs for inline images and blob for generated images
    "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com",

    // Fonts: Allow data URIs for inline fonts
    "font-src 'self' data:",

    // Connections: Allow self, WebSocket to relay, and analytics
    isDevelopment
      ? // Development: Allow localhost WebSocket and HTTPS connections
        "connect-src 'self' ws://localhost:* wss://localhost:* https:"
      : // Production: Restrict to known relay hosts and analytics
        "connect-src 'self' wss://*.vercel.app wss://*.render.com wss://*.onrender.com https://www.google-analytics.com https://www.googletagmanager.com https://analytics.google.com",

    // Frame restrictions
    "frame-ancestors 'none'",

    // Form restrictions
    "base-uri 'self'",
    "form-action 'self'",

    // Block object embeds (Flash, Java, etc.)
    "object-src 'none'",

    // Web Workers
    "worker-src 'self' blob:",

    // Manifest for PWA
    "manifest-src 'self'",

    // No audio/video
    "media-src 'none'",

    // Upgrade insecure requests (HTTP -> HTTPS)
    'upgrade-insecure-requests',
  ];

  return directives.join('; ');
}

/**
 * Get all security headers for Next.js configuration.
 */
export function getSecurityHeaders(isDevelopment = false) {
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
    // HSTS (only in production with HTTPS)
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
