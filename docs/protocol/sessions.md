# Sessions

## Identity

- Session ids are hex strings matching `SESSION_ID_PATTERN` (`[a-f0-9]{16,64}`)
- Clients may propose an id on create, or let the reference relay generate one

## Occupancy

- A session has at most **two** participants
- A third join attempt fails (`SESSION_FULL`)

## Lifetime

- `SESSION_TTL_MS` — wall-clock lifetime from creation (30 minutes in the reference protocol constants)
- When TTL elapses, the relay emits `SESSION_EXPIRED` and destroys the session

## Disconnect and reconnect

- When the last participant disconnects, the session may remain empty for `RECONNECT_GRACE_MS` (60 seconds) so a mobile client can reclaim it
- After the grace period, an empty session is destroyed
- Reclaim may occur via `CREATE_SESSION` or `JOIN_SESSION` against the same id while the session is still empty and unexpired

## No persistence

- Relays MUST NOT write messages or session history to durable storage as part of the protocol
- Reference relay: in-memory map only

## Presence handles

- A handle is a live mailbox, not a session. Valid slugs match `HANDLE_PATTERN` and must not collide with reserved app paths (`chat`, `guide`, …).
- `CLAIM_HANDLE` binds a slug to the owner’s mailbox WebSocket. The claim is released on disconnect or `UNCLAIM_HANDLE`. Relay restarts wipe **presence**, not reserved names.
- Names in `handles.json` (`publicKey` + `expiresAt`) survive redeploy. Claiming a reserved name requires a signature from the current lease private key. When the lease expires, the operator issues a new key to the next person. The URL stays the same.
- `RING_HANDLE` creates a normal two-party session (caller is participant 1) and emits `INCOMING_RING` to the owner. The chat then follows the usual TTL and occupancy rules.
- If the handle is not claimed, the relay returns `HANDLE_UNAVAILABLE`. If inbound chats for that handle already equal `PREMIUM_MAX_CONCURRENT_CHATS` (7), it returns `HANDLE_BUSY`. Clients without a claimed name cap themselves at `FREE_MAX_CONCURRENT_CHATS` (3).
- Relays MUST NOT publish a directory of online handles. Visiting `/{handle}` reveals whether that name is currently claimed.
