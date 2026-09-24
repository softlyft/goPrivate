import { describe, expect, it } from 'vitest';
import { extractSessionId } from './session-link.js';

const id = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

describe('extractSessionId', () => {
  it('accepts a raw hex id', () => {
    expect(extractSessionId(id)).toBe(id);
  });

  it('accepts production, www, vercel, and localhost chat urls', () => {
    expect(extractSessionId(`https://goprivate.app/chat/${id}`)).toBe(id);
    expect(extractSessionId(`https://www.goprivate.app/chat/${id}`)).toBe(id);
    expect(extractSessionId(`https://go-private.vercel.app/chat/${id}`)).toBe(id);
    expect(extractSessionId(`http://localhost:3002/chat/${id}`)).toBe(id);
  });

  it('accepts custom scheme links', () => {
    expect(extractSessionId(`goprivate://chat/${id}`)).toBe(id);
    expect(extractSessionId(`goprivate://${id}`)).toBe(id);
  });

  it('rejects short or non-hex values', () => {
    expect(extractSessionId('abc123')).toBeNull();
    expect(extractSessionId('https://goprivate.app/guide')).toBeNull();
  });
});
