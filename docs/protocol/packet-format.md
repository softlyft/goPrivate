# Packet format

All client ↔ relay frames are **JSON text** over WebSocket (reference path `/ws`).

## Client → relay (`ClientEvent`)

| Type             | Purpose                                        |
| ---------------- | ---------------------------------------------- |
| `CREATE_SESSION` | Create or reclaim a session                    |
| `JOIN_SESSION`   | Join an existing session                       |
| `SEND_MESSAGE`   | Forward an opaque message envelope to the peer |
| `PING`           | Keepalive                                      |
| `LEAVE_SESSION`  | Leave the session                              |

### Encrypted message envelope

```json
{
  "id": "string",
  "encryptedPayload": "string",
  "timestamp": 0
}
```

The relay treats `encryptedPayload` as opaque after validation (length limits). It MUST NOT require the ability to decrypt it.

## Relay → client (`RelayEvent`)

| Type              | Purpose                              |
| ----------------- | ------------------------------------ |
| `SESSION_CREATED` | Session accepted                     |
| `PARTNER_JOINED`  | Second participant present           |
| `MESSAGE`         | Forwarded envelope                   |
| `PARTNER_LEFT`    | Peer disconnected                    |
| `SESSION_EXPIRED` | TTL reached                          |
| `ERROR`           | Structured error (`code`, `message`) |
| `PONG`            | Response to `PING`                   |

## Size limits (reference constants)

See `@goprivate/protocol` — e.g. `MAX_WS_MESSAGE_BYTES`, `MAX_ENCRYPTED_PAYLOAD_CHARS`, `MAX_CHAT_TEXT_CHARS` (plaintext limit enforced by clients).
