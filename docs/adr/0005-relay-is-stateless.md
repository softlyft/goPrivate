# ADR 0005: Relay is effectively ephemeral / non-durable

## Context

“Stateless” here means no durable message or identity store — not that the process holds zero RAM state.

## Decision

Sessions live in process memory with TTL and reconnect grace only. No durable session journal.

## Consequences

- Operators must document that restarts drop conversations
- Multi-instance deployments need careful design (future federation/RFC territory)
- Matches protocol goals of minimal relay knowledge and no history
