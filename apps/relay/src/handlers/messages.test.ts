import {
  ClientEvent,
  MAX_RELAY_SESSIONS,
  RECONNECT_GRACE_MS,
  RelayEvent,
} from '@goprivate/protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createMessageHandler,
  expireSession,
  handleDisconnect,
  sweepExpiredSessions,
} from './messages.js';
import { InMemorySessionStore } from '../session/store.js';
import { allowAction, resetRateLimitsForTests } from '../services/limits.js';

type FakeSocket = {
  sent: unknown[];
  send: (data: string) => void;
  close: ReturnType<typeof vi.fn>;
};

function fakeSocket(): FakeSocket {
  const socket: FakeSocket = {
    sent: [],
    send(data: string) {
      socket.sent.push(JSON.parse(data));
    },
    close: vi.fn(),
  };
  return socket;
}

function sid(char: string): string {
  return char.repeat(32);
}

function lastError(socket: FakeSocket): string | undefined {
  const err = [...socket.sent]
    .reverse()
    .find((m) => (m as { type: string }).type === RelayEvent.ERROR);
  return (err as { payload?: { code?: string } } | undefined)?.payload?.code;
}

describe('message handlers', () => {
  afterEach(() => {
    resetRateLimitsForTests();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('creates, joins, relays messages, leaves, and disconnects', () => {
    const store = new InMemorySessionStore();
    const handle = createMessageHandler(store);
    const a = fakeSocket();
    const b = fakeSocket();
    const sessionId = sid('a');

    handle(
      a as never,
      JSON.stringify({ type: ClientEvent.CREATE_SESSION, payload: { sessionId } }),
      '1.1.1.1',
    );
    expect(a.sent[0]).toMatchObject({ type: RelayEvent.SESSION_CREATED });

    handle(
      b as never,
      JSON.stringify({ type: ClientEvent.JOIN_SESSION, payload: { sessionId } }),
      '2.2.2.2',
    );
    expect(a.sent.some((m) => (m as { type: string }).type === RelayEvent.PARTNER_JOINED)).toBe(
      true,
    );

    handle(
      a as never,
      JSON.stringify({
        type: ClientEvent.SEND_MESSAGE,
        payload: {
          message: { id: 'm1', encryptedPayload: 'cipher', timestamp: Date.now() },
        },
      }),
      '1.1.1.1',
    );
    expect(b.sent.at(-1)).toMatchObject({
      type: RelayEvent.MESSAGE,
      payload: { message: { encryptedPayload: 'cipher' } },
    });

    handle(a as never, JSON.stringify({ type: ClientEvent.PING }), '1.1.1.1');
    expect(a.sent.at(-1)).toMatchObject({ type: RelayEvent.PONG });

    handle(
      a as never,
      JSON.stringify({ type: ClientEvent.LEAVE_SESSION, payload: { sessionId } }),
      '1.1.1.1',
    );
    expect(b.sent.at(-1)).toMatchObject({ type: RelayEvent.PARTNER_LEFT });

    handleDisconnect(store, b as never);
  });

  it('rejects invalid JSON and unknown events safely', () => {
    const store = new InMemorySessionStore();
    const handle = createMessageHandler(store);
    const socket = fakeSocket();

    handle(socket as never, '{bad', '9.9.9.9');
    expect(lastError(socket)).toBe('INVALID_JSON');

    handle(socket as never, JSON.stringify({ type: 'NOPE' }), '9.9.9.9');
    expect(lastError(socket)).toBe('UNKNOWN_EVENT');
  });

  it('blocks create when already in a session or session exists', () => {
    const store = new InMemorySessionStore();
    const handle = createMessageHandler(store);
    const socket = fakeSocket();
    const other = fakeSocket();
    const sessionId = sid('b');

    handle(
      socket as never,
      JSON.stringify({ type: ClientEvent.CREATE_SESSION, payload: { sessionId } }),
      '3.3.3.3',
    );
    handle(
      socket as never,
      JSON.stringify({ type: ClientEvent.CREATE_SESSION, payload: { sessionId: sid('c') } }),
      '3.3.3.3',
    );
    expect(lastError(socket)).toBe('ALREADY_IN_SESSION');

    handle(
      other as never,
      JSON.stringify({ type: ClientEvent.CREATE_SESSION, payload: { sessionId } }),
      '3.3.3.4',
    );
    expect(lastError(other)).toBe('SESSION_EXISTS');
  });

  it('covers join error paths', () => {
    const store = new InMemorySessionStore();
    const handle = createMessageHandler(store);
    const host = fakeSocket();
    const joiner = fakeSocket();
    const third = fakeSocket();
    const sessionId = sid('d');

    handle(
      joiner as never,
      JSON.stringify({ type: ClientEvent.JOIN_SESSION, payload: { sessionId } }),
      'j1',
    );
    expect(lastError(joiner)).toBe('SESSION_NOT_FOUND');

    handle(
      host as never,
      JSON.stringify({ type: ClientEvent.CREATE_SESSION, payload: { sessionId } }),
      'h1',
    );
    handle(
      joiner as never,
      JSON.stringify({ type: ClientEvent.JOIN_SESSION, payload: { sessionId } }),
      'j2',
    );
    handle(
      third as never,
      JSON.stringify({ type: ClientEvent.JOIN_SESSION, payload: { sessionId } }),
      'j3',
    );
    expect(lastError(third)).toBe('SESSION_FULL');

    handle(
      joiner as never,
      JSON.stringify({ type: ClientEvent.JOIN_SESSION, payload: { sessionId: sid('e') } }),
      'j4',
    );
    expect(lastError(joiner)).toBe('ALREADY_IN_SESSION');
  });

  it('rejects send when not in session and expires on send', () => {
    const store = new InMemorySessionStore();
    const handle = createMessageHandler(store);
    const socket = fakeSocket();
    const sessionId = sid('f');

    handle(
      socket as never,
      JSON.stringify({
        type: ClientEvent.SEND_MESSAGE,
        payload: { message: { id: '1', encryptedPayload: 'x', timestamp: 1 } },
      }),
      's1',
    );
    expect(lastError(socket)).toBe('NOT_IN_SESSION');

    handle(
      socket as never,
      JSON.stringify({ type: ClientEvent.CREATE_SESSION, payload: { sessionId } }),
      's2',
    );
    const session = store.get(sessionId)!;
    session.expiresAt = Date.now() - 1;
    handle(
      socket as never,
      JSON.stringify({
        type: ClientEvent.SEND_MESSAGE,
        payload: { message: { id: '2', encryptedPayload: 'y', timestamp: 1 } },
      }),
      's3',
    );
    expect(store.get(sessionId)).toBeUndefined();
  });

  it('reclaims empty sessions and schedules grace destroy', () => {
    vi.useFakeTimers();
    const store = new InMemorySessionStore();
    const handle = createMessageHandler(store);
    const host = fakeSocket();
    const reclaim = fakeSocket();
    const sessionId = sid('1');

    handle(
      host as never,
      JSON.stringify({ type: ClientEvent.CREATE_SESSION, payload: { sessionId } }),
      'r1',
    );
    handleDisconnect(store, host as never);
    expect(store.get(sessionId)?.participants).toHaveLength(0);

    handle(
      reclaim as never,
      JSON.stringify({ type: ClientEvent.CREATE_SESSION, payload: { sessionId } }),
      'r2',
    );
    expect(reclaim.sent.at(-1)).toMatchObject({ type: RelayEvent.SESSION_CREATED });

    handleDisconnect(store, reclaim as never);
    vi.advanceTimersByTime(RECONNECT_GRACE_MS + 1);
    expect(store.get(sessionId)).toBeUndefined();
  });

  it('rejects join to expired sessions and create reclaim of expired empties', () => {
    const store = new InMemorySessionStore();
    const handle = createMessageHandler(store);
    const host = fakeSocket();
    const joiner = fakeSocket();
    const sessionId = sid('2');

    handle(
      host as never,
      JSON.stringify({ type: ClientEvent.CREATE_SESSION, payload: { sessionId } }),
      'e1',
    );
    handleDisconnect(store, host as never);
    const empty = store.get(sessionId)!;
    empty.expiresAt = Date.now() - 1;

    handle(
      joiner as never,
      JSON.stringify({ type: ClientEvent.JOIN_SESSION, payload: { sessionId } }),
      'e2',
    );
    expect(lastError(joiner)).toBe('SESSION_EXPIRED');

    const sessionId2 = sid('3');
    const host2 = fakeSocket();
    const reclaim = fakeSocket();
    handle(
      host2 as never,
      JSON.stringify({ type: ClientEvent.CREATE_SESSION, payload: { sessionId: sessionId2 } }),
      'e3',
    );
    handleDisconnect(store, host2 as never);
    store.get(sessionId2)!.expiresAt = Date.now() - 1;
    handle(
      reclaim as never,
      JSON.stringify({ type: ClientEvent.CREATE_SESSION, payload: { sessionId: sessionId2 } }),
      'e4',
    );
    expect(lastError(reclaim)).toBe('SESSION_EXPIRED');
  });

  it('rate-limits create/join/send and reports server busy', () => {
    const store = new InMemorySessionStore();
    const handle = createMessageHandler(store);
    const ip = 'rate.limit.ip';

    while (allowAction(ip, 'create')) {
      // drain create budget
    }
    const limited = fakeSocket();
    handle(
      limited as never,
      JSON.stringify({ type: ClientEvent.CREATE_SESSION, payload: { sessionId: sid('4') } }),
      ip,
    );
    expect(lastError(limited)).toBe('RATE_LIMITED');

    resetRateLimitsForTests();
    while (allowAction(ip, 'join')) {
      // drain join
    }
    handle(
      limited as never,
      JSON.stringify({ type: ClientEvent.JOIN_SESSION, payload: { sessionId: sid('5') } }),
      ip,
    );
    expect(lastError(limited)).toBe('RATE_LIMITED');

    resetRateLimitsForTests();
    const host = fakeSocket();
    handle(
      host as never,
      JSON.stringify({ type: ClientEvent.CREATE_SESSION, payload: { sessionId: sid('6') } }),
      'other',
    );
    while (allowAction(ip, 'send')) {
      // drain send
    }
    handle(
      host as never,
      JSON.stringify({
        type: ClientEvent.SEND_MESSAGE,
        payload: { message: { id: '1', encryptedPayload: 'z', timestamp: 1 } },
      }),
      ip,
    );
    expect(lastError(host)).toBe('RATE_LIMITED');

    resetRateLimitsForTests();
    vi.spyOn(store, 'size').mockReturnValue(MAX_RELAY_SESSIONS);
    const busy = fakeSocket();
    handle(
      busy as never,
      JSON.stringify({ type: ClientEvent.CREATE_SESSION, payload: { sessionId: sid('7') } }),
      'busy',
    );
    expect(lastError(busy)).toBe('SERVER_BUSY');
  });

  it('expires sessions via sweep and expireSession', () => {
    const store = new InMemorySessionStore();
    const handle = createMessageHandler(store);
    const socket = fakeSocket();
    const sessionId = sid('8');

    handle(
      socket as never,
      JSON.stringify({ type: ClientEvent.CREATE_SESSION, payload: { sessionId } }),
      '4.4.4.4',
    );
    const session = store.get(sessionId)!;
    session.expiresAt = Date.now() - 1;
    expect(sweepExpiredSessions(store)).toBe(1);
    expect(store.get(sessionId)).toBeUndefined();
    expect(
      socket.sent.some((m) => (m as { type: string }).type === RelayEvent.SESSION_EXPIRED),
    ).toBe(true);
  });

  it('closes sockets when expireSession is called directly', () => {
    const store = new InMemorySessionStore();
    const handle = createMessageHandler(store);
    const socket = fakeSocket();
    const sessionId = sid('9');
    handle(
      socket as never,
      JSON.stringify({ type: ClientEvent.CREATE_SESSION, payload: { sessionId } }),
      '5.5.5.5',
    );
    expireSession(store, store.get(sessionId)!);
    expect(socket.close).toHaveBeenCalled();
  });

  it('creates a session without client-provided id', () => {
    const store = new InMemorySessionStore();
    const handle = createMessageHandler(store);
    const socket = fakeSocket();
    handle(socket as never, JSON.stringify({ type: ClientEvent.CREATE_SESSION }), 'auto');
    expect(socket.sent[0]).toMatchObject({ type: RelayEvent.SESSION_CREATED });
  });

  it('rejoins empty session via JOIN with SESSION_CREATED', () => {
    const store = new InMemorySessionStore();
    const handle = createMessageHandler(store);
    const host = fakeSocket();
    const rejoiner = fakeSocket();
    const sessionId = sid('0');

    handle(
      host as never,
      JSON.stringify({ type: ClientEvent.CREATE_SESSION, payload: { sessionId } }),
      'rj1',
    );
    handleDisconnect(store, host as never);
    handle(
      rejoiner as never,
      JSON.stringify({ type: ClientEvent.JOIN_SESSION, payload: { sessionId } }),
      'rj2',
    );
    expect(rejoiner.sent.at(-1)).toMatchObject({ type: RelayEvent.SESSION_CREATED });
  });
});
