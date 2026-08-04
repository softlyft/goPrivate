import { SESSION_TTL_MS } from '@goprivate/protocol';
import { describe, expect, it } from 'vitest';
import { InMemorySessionStore, type Participant } from './store.js';

function participant(id: string): Participant {
  return { id, socket: { id } as unknown as Participant['socket'] };
}

describe('InMemorySessionStore', () => {
  it('creates, fills, and removes participants', () => {
    const store = new InMemorySessionStore();
    const a = participant('a');
    const b = participant('b');
    const session = store.create('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', a);
    expect(store.size()).toBe(1);
    expect(store.get(session.id)?.participants).toHaveLength(1);

    store.addParticipant(session.id, b);
    expect(store.get(session.id)?.participants).toHaveLength(2);
    expect(() => store.addParticipant(session.id, participant('c'))).toThrow('SESSION_FULL');

    const found = store.findBySocket(a.socket);
    expect(found?.participant.id).toBe('a');

    const firstLeave = store.removeParticipant(session.id, 'a');
    expect(firstLeave.destroyed).toBe(false);
    const secondLeave = store.removeParticipant(session.id, 'b');
    expect(secondLeave.destroyed).toBe(true);
    expect(store.get(session.id)?.participants).toHaveLength(0);
  });

  it('detects expiry', () => {
    const store = new InMemorySessionStore();
    const session = store.create('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', participant('a'));
    expect(store.isExpired(session, session.createdAt + SESSION_TTL_MS - 1)).toBe(false);
    expect(store.isExpired(session, session.createdAt + SESSION_TTL_MS + 1)).toBe(true);
    expect(store.getExpired(session.createdAt + SESSION_TTL_MS + 1)).toHaveLength(1);
    store.destroy(session.id);
    expect(store.size()).toBe(0);
  });

  it('rejects duplicate create', () => {
    const store = new InMemorySessionStore();
    store.create('cccccccccccccccccccccccccccccccc', participant('a'));
    expect(() => store.create('cccccccccccccccccccccccccccccccc', participant('b'))).toThrow(
      'SESSION_EXISTS',
    );
  });
});
