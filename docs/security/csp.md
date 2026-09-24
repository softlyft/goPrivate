# Content Security Policy (CSP)

goPrivate sets CSP and other security headers in `apps/web/src/utils/csp.ts` (loaded from `next.config.ts`).

## Current configuration

### Production (`NODE_ENV=production`)

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com;
font-src 'self' data:;
connect-src 'self' wss://*.vercel.app wss://*.render.com wss://*.onrender.com https://www.google-analytics.com https://www.googletagmanager.com https://analytics.google.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
worker-src 'self' blob:;
manifest-src 'self';
media-src 'none';
upgrade-insecure-requests
```

Production **does not** include `unsafe-eval`.

### Development

`unsafe-eval` is allowed for Next.js. `connect-src` also allows local WebSockets and hosted relays (so `.env.local` can target either). `upgrade-insecure-requests` is omitted so `ws://localhost` is not rewritten to `wss://`.

```
connect-src 'self' ws://localhost:* ws://127.0.0.1:* wss://localhost:* wss://127.0.0.1:* wss://*.onrender.com wss://*.render.com wss://*.vercel.app https:
```

## Other security headers

| Header                      | Value                                                          | Purpose                         |
| --------------------------- | -------------------------------------------------------------- | ------------------------------- |
| `X-Content-Type-Options`    | `nosniff`                                                      | Prevent MIME sniffing           |
| `X-Frame-Options`           | `DENY`                                                         | Prevent clickjacking            |
| `X-XSS-Protection`          | `1; mode=block`                                                | Legacy XSS filter               |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                              | Limit referrer leakage          |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | Block unused APIs and FLoC      |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload`                 | HTTPS only (production)         |

## Known limitations

- Next.js still needs `'unsafe-inline'` for hydration and inlined CSS
- `'unsafe-eval'` is development-only

Tests live in `apps/web/src/utils/csp.test.ts`.

When self-hosting a relay on another hostname, add it to production `connect-src` in `csp.ts`.
