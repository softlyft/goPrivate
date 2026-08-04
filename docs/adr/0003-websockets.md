# ADR 0003: WebSockets for transport

## Context

Peers need low-latency bidirectional messaging through a relay.

## Decision

Use WebSocket JSON frames between clients and the relay (`/ws`).

## Consequences

- Simple to implement and debug
- Requires proxy support for upgrades and long-lived connections
- Alternative transports can implement `ITransport` later without changing crypto
