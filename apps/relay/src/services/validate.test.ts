import { ClientEvent, MAX_WS_MESSAGE_BYTES } from '@goprivate/protocol';
import { describe, expect, it } from 'vitest';
import { parseClientMessage } from './validate.js';

const validId = 'a'.repeat(32);

describe('parseClientMessage', () => {
  it('rejects oversized frames', () => {
    const result = parseClientMessage('x'.repeat(MAX_WS_MESSAGE_BYTES + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('rejects invalid JSON', () => {
    const result = parseClientMessage('{nope');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_JSON');
  });

  it('parses CREATE_SESSION with and without sessionId', () => {
    expect(parseClientMessage(JSON.stringify({ type: ClientEvent.CREATE_SESSION }))).toMatchObject({
      ok: true,
    });
    const withId = parseClientMessage(
      JSON.stringify({ type: ClientEvent.CREATE_SESSION, payload: { sessionId: validId } }),
    );
    expect(withId.ok).toBe(true);
    if (withId.ok && withId.message.type === ClientEvent.CREATE_SESSION) {
      expect(withId.message.payload?.sessionId).toBe(validId);
    }
  });

  it('rejects bad session ids on join', () => {
    const result = parseClientMessage(
      JSON.stringify({ type: ClientEvent.JOIN_SESSION, payload: { sessionId: 'nope' } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_SESSION_ID');
  });

  it('parses SEND_MESSAGE and PING', () => {
    const send = parseClientMessage(
      JSON.stringify({
        type: ClientEvent.SEND_MESSAGE,
        payload: {
          message: { id: '1', encryptedPayload: 'abc', timestamp: Date.now() },
        },
      }),
    );
    expect(send.ok).toBe(true);

    expect(parseClientMessage(JSON.stringify({ type: ClientEvent.PING }))).toMatchObject({
      ok: true,
    });
  });

  it('rejects unknown events and invalid leave payloads', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'NOPE' })).ok).toBe(false);
    expect(
      parseClientMessage(JSON.stringify({ type: ClientEvent.LEAVE_SESSION, payload: [] })).ok,
    ).toBe(false);
  });

  it('rejects invalid CREATE payloads and leave without payload', () => {
    expect(
      parseClientMessage(JSON.stringify({ type: ClientEvent.CREATE_SESSION, payload: [] })).ok,
    ).toBe(false);
    expect(
      parseClientMessage(
        JSON.stringify({ type: ClientEvent.CREATE_SESSION, payload: { sessionId: '!!!' } }),
      ).ok,
    ).toBe(false);
    expect(parseClientMessage(JSON.stringify({ type: ClientEvent.LEAVE_SESSION }))).toMatchObject({
      ok: true,
    });
    expect(
      parseClientMessage(
        JSON.stringify({ type: ClientEvent.LEAVE_SESSION, payload: { sessionId: validId } }),
      ),
    ).toMatchObject({ ok: true });
  });
});
