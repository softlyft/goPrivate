# Contributing

Thanks for helping improve goPrivate — an open **protocol** for ephemeral communication, with reference client and relay implementations.

## Principles

Read [`governance/PRINCIPLES.md`](./governance/PRINCIPLES.md) before proposing large changes. Prefer RFCs for protocol changes.

## Local development

```bash
pnpm install
pnpm build:packages
pnpm typecheck
pnpm lint
pnpm test
pnpm format
pnpm dev
```

- Reference client: http://localhost:3000
- Reference relay: `ws://localhost:3001/ws`

See [`docs/self-hosting.md`](./docs/self-hosting.md) and the root README.

## Tests

```bash
pnpm test
pnpm test:coverage   # thresholds enforced
pnpm smoke:crypto
pnpm smoke:relay     # requires a running relay
```

## Pull requests

1. Fork and create a branch
2. Keep PRs focused (protocol vs client UX vs docs)
3. Ensure typecheck, lint, format check, and tests pass
4. Fill out the PR template
5. Link related issues / RFCs / ADRs

## Coding conventions

- TypeScript throughout; prefer small, explicit modules
- Protocol constants and event names live in `packages/protocol`
- Do not add durable server-side message storage
- Match existing formatting (`pnpm format`)

## Writing RFCs

1. Copy an existing file under `rfcs/` or add the next number
2. Describe motivation, proposal, and compatibility impact
3. Discuss before implementing wire-breaking changes
4. Record lasting architectural choices as ADRs in `docs/adr/`

## License

By contributing, you agree your contributions are licensed under the **AGPLv3** (see `LICENSE`).
