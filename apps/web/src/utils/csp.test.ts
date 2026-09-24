import { describe, expect, it } from 'vitest';
import { getCSPDirectives, getSecurityHeaders } from './csp.js';

describe('getCSPDirectives', () => {
  it('generates CSP directives for production', () => {
    const csp = getCSPDirectives(false);

    // Should include basic directives
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('upgrade-insecure-requests');

    // Should restrict connect-src to known production domains
    expect(csp).toContain('wss://*.vercel.app');
    expect(csp).toContain('wss://*.render.com');
    expect(csp).not.toContain('ws://localhost');
  });

  it('allows localhost and hosted relays in development', () => {
    const csp = getCSPDirectives(true);

    expect(csp).toContain('ws://localhost:*');
    expect(csp).toContain('wss://localhost:*');
    expect(csp).toContain('wss://*.onrender.com');
    expect(csp).not.toContain('upgrade-insecure-requests');
  });

  it('includes security-critical directives', () => {
    const csp = getCSPDirectives(false);

    // No inline objects
    expect(csp).toContain("object-src 'none'");

    // No audio/video
    expect(csp).toContain("media-src 'none'");

    // Form restrictions
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("base-uri 'self'");

    // Frame restrictions
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('allows data URIs for fonts and images', () => {
    const csp = getCSPDirectives(false);

    expect(csp).toContain('font-src');
    expect(csp).toContain('data:');
    expect(csp).toContain('img-src');
  });

  it('allows workers with blob', () => {
    const csp = getCSPDirectives(false);

    expect(csp).toContain("worker-src 'self' blob:");
  });
});

describe('getSecurityHeaders', () => {
  it('includes CSP header', () => {
    const headers = getSecurityHeaders(false);
    const cspHeader = headers.find((h) => h.key === 'Content-Security-Policy');

    expect(cspHeader).toBeDefined();
    expect(cspHeader?.value).toContain("default-src 'self'");
  });

  it('includes X-Content-Type-Options', () => {
    const headers = getSecurityHeaders(false);
    const header = headers.find((h) => h.key === 'X-Content-Type-Options');

    expect(header).toBeDefined();
    expect(header?.value).toBe('nosniff');
  });

  it('includes X-Frame-Options', () => {
    const headers = getSecurityHeaders(false);
    const header = headers.find((h) => h.key === 'X-Frame-Options');

    expect(header).toBeDefined();
    expect(header?.value).toBe('DENY');
  });

  it('includes X-XSS-Protection', () => {
    const headers = getSecurityHeaders(false);
    const header = headers.find((h) => h.key === 'X-XSS-Protection');

    expect(header).toBeDefined();
    expect(header?.value).toBe('1; mode=block');
  });

  it('includes Referrer-Policy', () => {
    const headers = getSecurityHeaders(false);
    const header = headers.find((h) => h.key === 'Referrer-Policy');

    expect(header).toBeDefined();
    expect(header?.value).toBe('strict-origin-when-cross-origin');
  });

  it('includes Permissions-Policy blocking sensitive APIs', () => {
    const headers = getSecurityHeaders(false);
    const header = headers.find((h) => h.key === 'Permissions-Policy');

    expect(header).toBeDefined();
    expect(header?.value).toContain('camera=()');
    expect(header?.value).toContain('microphone=()');
    expect(header?.value).toContain('geolocation=()');
    expect(header?.value).toContain('interest-cohort=()'); // Anti-FLoC
  });

  it('includes HSTS in production only', () => {
    const devHeaders = getSecurityHeaders(true);
    const prodHeaders = getSecurityHeaders(false);

    const devHSTS = devHeaders.find((h) => h.key === 'Strict-Transport-Security');
    const prodHSTS = prodHeaders.find((h) => h.key === 'Strict-Transport-Security');

    expect(devHSTS).toBeUndefined();
    expect(prodHSTS).toBeDefined();
    expect(prodHSTS?.value).toContain('max-age=31536000');
    expect(prodHSTS?.value).toContain('includeSubDomains');
    expect(prodHSTS?.value).toContain('preload');
  });
});
