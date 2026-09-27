import { webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ecdhP256SharedX, fromBase64Url, p256ScalarFromPkcs8 } from './ecdh-shared.js';

const subtle = webcrypto.subtle;

describe('ecdhP256SharedX', () => {
  it('matches Web Crypto ECDH deriveBits for P-256', async () => {
    const alice = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
      'deriveBits',
    ]);
    const bob = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
      'deriveBits',
    ]);

    const webShared = new Uint8Array(
      await subtle.deriveBits({ name: 'ECDH', public: bob.publicKey }, alice.privateKey, 256),
    );

    const aliceJwk = await subtle.exportKey('jwk', alice.privateKey);
    const bobRaw = new Uint8Array(await subtle.exportKey('raw', bob.publicKey));
    if (!aliceJwk.d) throw new Error('missing JWK d');

    const nobleShared = ecdhP256SharedX(fromBase64Url(aliceJwk.d), bobRaw);
    expect(Array.from(nobleShared)).toEqual(Array.from(webShared));
    expect(nobleShared.length).toBe(32);
  });

  it('extracts the same scalar from PKCS#8 as from JWK', async () => {
    const pair = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
      'deriveBits',
    ]);
    const jwk = await subtle.exportKey('jwk', pair.privateKey);
    if (!jwk.d) throw new Error('missing JWK d');
    const pkcs8 = new Uint8Array(await subtle.exportKey('pkcs8', pair.privateKey));

    expect(Array.from(p256ScalarFromPkcs8(pkcs8))).toEqual(Array.from(fromBase64Url(jwk.d)));
  });
});
