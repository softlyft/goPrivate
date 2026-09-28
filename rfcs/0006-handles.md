# RFC 0006: Presence handles

**Status:** Draft / descriptive of current implementation

A handle is a **live presence mailbox**, not a session and not an account.

## Why

Share links today (`/chat/{hex}`) _are_ the conversation: two parties, 30-minute TTL. A lasting `/{handle}` URL can only mean “reach me while I am connected.” Offline visitors see `HANDLE_UNAVAILABLE`. There is no voicemail and no database.

## Events

Client → relay:

- `CLAIM_HANDLE { handle, secret?, proof? }` — `proof` is `{ publicKey, signedAt, signature }` for a reserved lease
- `UNCLAIM_HANDLE`
- `RING_HANDLE { handle }`

Relay → client:

- `HANDLE_CLAIMED { handle }`
- `INCOMING_RING { sessionId, handle, expiresAt }`
- `RING_READY { sessionId, expiresAt }`

Errors: `HANDLE_UNAVAILABLE`, `HANDLE_BUSY`, `HANDLE_TAKEN`, `HANDLE_INVALID`, `HANDLE_FORBIDDEN`.

## Behaviour

- Claims live in relay memory and die when the owner’s mailbox socket closes or the process restarts.
- Clients remember the last claimed handle and lease key on-device (`localStorage` on web, SecureStore on mobile) so returning on the same device can show the lasting link and reclaim without pasting the key again. Presence still requires a live mailbox socket.
- `RING_HANDLE` creates a normal two-party session with the caller as the first participant, then pages the owner. The owner `JOIN_SESSION`s on a **new** WebSocket.
- Inbound sessions per handle are capped at `PREMIUM_MAX_CONCURRENT_CHATS` (7). Clients without a claimed name are capped at `FREE_MAX_CONCURRENT_CHATS` (3).
- Optional `HANDLE_ALLOWLIST` and relay `HANDLE_CLAIM_SECRET` restrict unregistered names. Names listed in `handles.json` are reserved leases: the assignee proves ownership with a time-limited device key.

See `docs/protocol/sessions.md`.
