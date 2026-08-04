# Sessions

## Identity

- Session ids are hex strings matching `SESSION_ID_PATTERN` (`[a-f0-9]{16,64}`)
- Clients may propose an id on create, or let the reference relay generate one

## Occupancy

- A session has at most **two** participants
- A third join attempt fails (`SESSION_FULL`)

## Lifetime

- `SESSION_TTL_MS` — wall-clock lifetime from creation (15 minutes in the reference protocol constants)
- When TTL elapses, the relay emits `SESSION_EXPIRED` and destroys the session

## Disconnect and reconnect

- When the last participant disconnects, the session may remain empty for `RECONNECT_GRACE_MS` (60 seconds) so a mobile client can reclaim it
- After the grace period, an empty session is destroyed
- Reclaim may occur via `CREATE_SESSION` or `JOIN_SESSION` against the same id while the session is still empty and unexpired

## No persistence

- Relays MUST NOT write messages or session history to durable storage as part of the protocol
- Reference relay: in-memory map only
