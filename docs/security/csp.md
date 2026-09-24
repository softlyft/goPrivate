# Content Security Policy (CSP)

goPrivate implements Content Security Policy headers to provide defense-in-depth against XSS attacks.

## Current Configuration

### Production

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com;
  font-src 'self' data:;
  connect-src 'self' wss://*.vercel.app wss://*.render.com wss://*.onrender.com https://www.google-analytics.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
  worker-src 'self' blob:;
  manifest-src 'self';
  media-src 'none';
  upgrade-insecure-requests
```

### Development

Same as production but with more permissive `connect-src`:

```
connect-src 'self' ws://localhost:* wss://localhost:* https:
```

## Security Headers

In addition to CSP, goPrivate sets these security headers:

| Header                      | Value                                                          | Purpose                                     |
| --------------------------- | -------------------------------------------------------------- | ------------------------------------------- |
| `X-Content-Type-Options`    | `nosniff`                                                      | Prevent MIME sniffing attacks               |
| `X-Frame-Options`           | `DENY`                                                         | Prevent clickjacking                        |
| `X-XSS-Protection`          | `1; mode=block`                                                | Enable browser XSS filter (legacy browsers) |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                              | Limit referrer information leakage          |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | Block sensitive APIs and FLoC               |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload`                 | Enforce HTTPS (production only)             |

## Known Limitations

### `'unsafe-inline'` and `'unsafe-eval'`

**Why they're present:**

- Next.js requires `'unsafe-inline'` for React hydration scripts
- Next.js requires `'unsafe-eval'` in development mode
- Production CSS inlining requires `'unsafe-inline'` for styles

**Mitigation:**

- Input sanitization with DOMPurify (see [XSS Protection](/docs/security/xss.md))
- End-to-end encryption means relay cannot inject malicious content
- Vault encryption protects messages at rest

### Future Improvements

1. **Nonce-based CSP**: Implement per-request nonces for inline scripts
   - Requires middleware to generate nonces
   - Pass nonce to all inline script tags
   - Update CSP header to use `script-src 'nonce-{random}'` instead of `'unsafe-inline'`

2. **Hash-based CSP**: Use SHA-256 hashes for specific inline styles
   - Calculate hashes of inline styles during build
   - Add hashes to CSP policy
   - Remove `'unsafe-inline'` from `style-src`

3. **Strict CSP**: Migrate to `strict-dynamic` when Next.js supports it
   ```
   script-src 'nonce-{random}' 'strict-dynamic'
   ```

## Testing

CSP configuration is tested in `apps/web/src/utils/csp.test.ts`:

- ✅ Production vs. development differences
- ✅ All security-critical directives
- ✅ HSTS only in production
- ✅ Localhost WebSocket in development

## Self-Hosting

When self-hosting, update `connect-src` to include your relay domain:

```typescript
// apps/web/src/utils/csp.ts
"connect-src 'self' wss://your-relay-domain.com https://analytics.example.com";
```

## Monitoring

**Browser console errors** indicate CSP violations:

```
Refused to load the script 'https://evil.com/script.js' because it violates
the following Content Security Policy directive: "script-src 'self'"
```

**Production monitoring**: Consider implementing CSP reporting:

```
Content-Security-Policy-Report-Only: ...; report-uri /api/csp-report
```

## References

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
