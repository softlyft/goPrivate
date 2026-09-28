import { describe, expect, it } from 'vitest';
import { DEEP_LINK_SCHEME, PUBLIC_WEB_ORIGINS, customSchemeUrl } from '@goprivate/config';
import { chatHref, extractSessionId } from './session-link.js';

const id = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

describe('extractSessionId', () => {
  it('accepts a raw hex id', () => {
    expect(extractSessionId(id)).toBe(id);
  });

  it('accepts production, www, vercel, and localhost chat urls', () => {
    for (const origin of PUBLIC_WEB_ORIGINS) {
      expect(extractSessionId(`${origin}/chat/${id}`)).toBe(id);
    }
    expect(extractSessionId(`http://localhost:3002/chat/${id}`)).toBe(id);
  });

  it('accepts custom scheme links', () => {
    expect(extractSessionId(customSchemeUrl(id))).toBe(id);
    expect(extractSessionId(`${DEEP_LINK_SCHEME}://${id}`)).toBe(id);
  });

  it('rejects short or non-hex values', () => {
    expect(extractSessionId('abc123')).toBeNull();
    expect(extractSessionId('https://goprivate.app/guide')).toBeNull();
  });

  it('marks host chats so the screen creates instead of joining', () => {
    expect(chatHref(id, { host: true })).toEqual({
      pathname: '/chat/[sessionId]',
      params: { sessionId: id, host: '1' },
    });
    expect(chatHref(id).params.host).toBeUndefined();
  });
});
