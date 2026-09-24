# Architecture overview

## Principles

- Relay forwards opaque encrypted packets only (after handshake)
- No database, Redis, or user storage
- Sessions live in memory and die when empty (with a short reconnect grace)
- Crypto uses Web Crypto in the browser and `react-native-quick-crypto` on native (ECDH P-256 → AES-GCM)
- Sessions last 30 minutes from creation (`SESSION_TTL_MS`)

## Threat model

| Adversary                                         | Protected? | Notes                                                                                                                                        |
| ------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Passive relay / network observer of ciphertext    | Yes        | Chat payloads are AES-GCM after ECDH                                                                                                         |
| Compromised / malicious relay during key exchange | **No**     | Public keys are exchanged as plaintext JSON inside `encryptedPayload` before a shared secret exists (TOFU). A malicious relay can MITM ECDH. |
| Other users / session squatting                   | Partial    | Two-party cap + session id entropy; share the link only with your partner                                                                    |
| Casual device inspection of app storage           | Yes        | Messages at rest are vault-encrypted; PIN wraps the vault key                                                                                |
| Offline brute-force of a 6-digit PIN              | Moderate   | 1 million PIN combinations; mitigated by high PBKDF2 iterations and in-memory session lifetime                                               |
| Shoulder surfing the PIN pad                      | No         | UX tradeoff                                                                                                                                  |

**Honest summary for users:** trust the share link and an honest relay. The service cannot read your messages if it only forwards ciphertext, but a hostile relay operator could swap keys during handshake. Device PIN protects masked local history during the session, not against a determined offline attacker if vault material were retained.

## Data flow

```
User A                    Relay                     User B
  |                         |                         |
  |-- CREATE_SESSION ------>|                         |
  |<-- SESSION_CREATED -----|                         |
  |                         |<---- JOIN_SESSION ------|
  |<-- PARTNER_JOINED ------|-- PARTNER_JOINED ------>|
  |-- SEND_MESSAGE (pubkey)>|-- MESSAGE (pubkey) ---->|
  |<-- MESSAGE (pubkey) ----|<-- SEND_MESSAGE (pubkey)|
  |   [derive shared key]   |   [derive shared key]   |
  |-- SEND_MESSAGE (AES) -->|-- MESSAGE (AES) ------->|
  |<-- MESSAGE (AES) -------|<-- SEND_MESSAGE (AES) --|
```

## Relay hardening (production)

- `maxPayload` on WebSocket frames
- Schema validation for all client events
- Per-IP rate limits on create / join / send
- Caps on concurrent sessions and connections
- Graceful `SIGTERM` / `SIGINT` shutdown

## Interfaces (future-ready)

| Interface         | Package | Purpose                         |
| ----------------- | ------- | ------------------------------- |
| `ICryptoProvider` | crypto  | Web (`platform.ts`) or native (`native-crypto.ts`) |
| `ITransport`      | sdk     | Swap WebSocket transport        |
| `IRelayClient`    | sdk     | High-level session + messaging  |
| `ISessionStore`   | relay   | Swap in-memory store if needed  |

See also: [Threat model](../threat-model.md), [Protocol docs](../protocol/), [ADRs](../adr/).
