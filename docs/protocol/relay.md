# Relay

## Role

A goPrivate relay:

- Accepts WebSocket connections
- Creates and joins short-lived two-party sessions
- Forwards opaque message envelopes between participants
- Enforces TTL, occupancy, and basic abuse controls

A relay MUST NOT:

- Persist chat history
- Require user accounts
- Decrypt application payloads (it also cannot, after handshake, without breaking the threat model’s passive-relay assumption)

## Reference relay hardening

- WebSocket `maxPayload`
- Schema validation for client events
- Per-IP rate limits on create / join / send
- Caps on concurrent sessions and connections
- Graceful shutdown on `SIGTERM` / `SIGINT`
- Reconnect grace for empty sessions

## Health

`GET /health` — liveness only; MUST NOT leak occupancy metrics publicly in the reference deployment.
