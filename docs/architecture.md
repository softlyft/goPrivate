# Architecture

## Principles

- Relay forwards opaque encrypted packets only
- No database, Redis, or user storage
- Sessions live in memory and die when empty
- Crypto uses browser Web Crypto API (ECDH P-256 → AES-GCM)

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

## Interfaces (future-ready)

| Interface        | Package  | Purpose                          |
|------------------|----------|----------------------------------|
| `ICryptoProvider`| crypto   | Swap Web Crypto for other impls  |
| `ITransport`     | sdk      | Swap WebSocket transport         |
| `IRelayClient`   | sdk      | High-level session + messaging   |
| `ISessionStore`  | relay    | Swap in-memory store if needed   |
