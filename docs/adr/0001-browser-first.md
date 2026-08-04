# ADR 0001: Browser-first reference client

## Context

We needed a shippable MVP clients operators and users can try without installing native apps.

## Decision

The first reference client is a web application (Next.js) using the Web Crypto API.

## Consequences

- Fast iteration and easy self-hosting via static/SSR hosting
- Crypto and UX constrained to browser capabilities and trust model
- Native clients remain a later roadmap item
