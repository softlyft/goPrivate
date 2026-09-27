import { webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { rawToSpki, spkiToRaw } from './ec-spki.js';

const subtle = webcrypto.subtle;

describe('P-256 SPKI ↔ raw', () => {
  it('wraps a raw point so Web Crypto can import it as SPKI', async () => {
    const pair = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
      'deriveBits',
    ]);
    const raw = new Uint8Array(await subtle.exportKey('raw', pair.publicKey));
    const spki = rawToSpki(raw);

    const imported = await subtle.importKey(
      'spki',
      spki,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      [],
    );
    const roundTrip = new Uint8Array(await subtle.exportKey('raw', imported));
    expect(Array.from(roundTrip)).toEqual(Array.from(raw));
  });

  it('unwraps a Web Crypto SPKI export to the raw point', async () => {
    const pair = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
      'deriveBits',
    ]);
    const spki = new Uint8Array(await subtle.exportKey('spki', pair.publicKey));
    const raw = spkiToRaw(spki);
    const expected = new Uint8Array(await subtle.exportKey('raw', pair.publicKey));

    expect(raw.length).toBe(65);
    expect(raw[0]).toBe(0x04);
    expect(Array.from(raw)).toEqual(Array.from(expected));
  });

  it('accepts an already-raw uncompressed point', () => {
    const raw = new Uint8Array(65);
    raw[0] = 0x04;
    expect(Array.from(spkiToRaw(raw))).toEqual(Array.from(raw));
  });
});
