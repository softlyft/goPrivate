# ADR 0002: No database

## Context

Ephemeral communication must not accumulate server-side history by accident.

## Decision

The reference relay stores sessions only in memory. No Redis, SQL, or object storage for messages.

## Consequences

- Restarts and deploys wipe live sessions
- Horizontal scale needs sticky routing or accepting session locality
- Strong alignment with the threat model’s “no long-term storage” goal
