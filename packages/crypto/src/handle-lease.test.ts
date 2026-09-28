import { describe, expect, it } from 'vitest';
import { parseHandleLeasePaste } from './handle-lease.js';

describe('handle lease paste', () => {
  it('reads an issue-handle block', () => {
    const parsed = parseHandleLeasePaste(`handle=alice
expiresAt=2026-10-28T00:00:00.000Z
publicKey=pub
privateKey=priv`);
    expect(parsed).toMatchObject({
      handle: 'alice',
      publicKey: 'pub',
      privateKey: 'priv',
    });
  });

  it('reads JSON', () => {
    expect(parseHandleLeasePaste(JSON.stringify({ handle: 'bob', privateKey: 'k' }))).toMatchObject(
      { handle: 'bob', privateKey: 'k' },
    );
  });
});
