# Message lifecycle

1. **Compose** — User enters plaintext in a client (max `MAX_CHAT_TEXT_CHARS` in the reference client)
2. **Encrypt** — Client encrypts an application plaintext structure (e.g. chat kind + text) with the session AES-GCM key
3. **Send** — Client emits `SEND_MESSAGE` with `{ id, encryptedPayload, timestamp }`
4. **Relay** — Validates envelope size/shape and broadcasts to the other participant only
5. **Receive** — Peer decrypts; UI may store ciphertext locally in a PIN-wrapped vault (reference client behavior — not required of all clients)
6. **End** — On leave, expiry, or process death, server-side copies are gone; clients SHOULD wipe session key material

Application-level kinds (reference):

- `PUBLIC_KEY` — handshake (see [handshake.md](./handshake.md))
- `CHAT` — user text after the channel is ready
