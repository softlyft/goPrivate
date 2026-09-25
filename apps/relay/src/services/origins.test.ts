import { describe, expect, it } from 'vitest';
import { isAllowedOrigin } from './origins.js';

describe('isAllowedOrigin', () => {
  it('allows missing origin (native apps, curl)', () => {
    expect(isAllowedOrigin(undefined, { nodeEnv: 'production' })).toBe(true);
  });

  it('allows production site origins', () => {
    expect(isAllowedOrigin('https://goprivate.vercel.app', { nodeEnv: 'production' })).toBe(true);
    expect(isAllowedOrigin('https://goprivate.app', { nodeEnv: 'production' })).toBe(true);
    expect(isAllowedOrigin('https://www.goprivate.app', { nodeEnv: 'production' })).toBe(true);
  });

  it('allows localhost on any port so local web can use a hosted relay', () => {
    expect(isAllowedOrigin('http://localhost:3002', { nodeEnv: 'production' })).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:3000', { nodeEnv: 'production' })).toBe(true);
  });

  it('allows LAN origins only outside production', () => {
    expect(isAllowedOrigin('http://192.168.1.20:3000', { nodeEnv: 'development' })).toBe(true);
    expect(isAllowedOrigin('http://192.168.1.20:3000', { nodeEnv: 'production' })).toBe(false);
  });

  it('honours ALLOWED_ORIGINS extras without dropping localhost', () => {
    expect(
      isAllowedOrigin('https://preview.example', {
        allowedOrigins: 'https://preview.example',
        nodeEnv: 'production',
      }),
    ).toBe(true);
    expect(
      isAllowedOrigin('http://localhost:3002', {
        allowedOrigins: 'https://preview.example',
        nodeEnv: 'production',
      }),
    ).toBe(true);
  });

  it('rejects unknown origins', () => {
    expect(isAllowedOrigin('https://evil.example', { nodeEnv: 'production' })).toBe(false);
  });
});
