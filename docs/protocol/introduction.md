# Protocol introduction

goPrivate is an **open protocol for ephemeral 1:1 communication**.

- Peers connect through a relay that should learn as little as possible
- Session lifetime is short; there is no server-side message history
- After an ECDH handshake, application payloads are end-to-end encrypted (AES-GCM)
- The TypeScript packages in this repository are a **reference implementation**, not the only allowed one

## Documents in this folder

| Doc | Topic |
| --- | ----- |
| [sessions.md](./sessions.md) | Session ids, TTL, occupancy, reconnect grace |
| [handshake.md](./handshake.md) | ECDH / TOFU public-key exchange |
| [packet-format.md](./packet-format.md) | Client ↔ relay JSON events |
| [message-lifecycle.md](./message-lifecycle.md) | From compose to peer decrypt |
| [relay.md](./relay.md) | Relay responsibilities and limits |

Independent implementations should be possible from these docs without reading the TypeScript source — that is an explicit goal as the protocol stabilizes.
