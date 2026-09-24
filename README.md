# goPrivate

**goPrivate is an open protocol for ephemeral communication.**

It enables conversations that naturally disappear without relying on user accounts, cloud storage, or persistent message history.

The official web client is the first **reference client**. The WebSocket server is the first **reference relay**. Long-term success is measured by protocol adoption — not by a single application.

Licensed under [AGPLv3](./LICENSE).

## Vision

Private, short-lived 1:1 communication should be possible without identity platforms or durable server-side archives. Self-hosting is a first-class option. See [`governance/VISION.md`](./governance/VISION.md) and [`PROJECT_CHARTER.md`](./PROJECT_CHARTER.md).

## Philosophy

- Privacy before convenience
- Protocol first, application second
- The relay knows as little as possible
- No vendor lock-in; no premium / enterprise split

Full list: [`governance/PRINCIPLES.md`](./governance/PRINCIPLES.md).

## Architecture

```
goprivate/
  apps/
    web/          Reference client (Next.js)
    relay/        Reference relay (Fastify WebSocket)
    mobile/       Reference mobile client (Expo / React Native)
  packages/
    protocol/     Shared events, limits, types (SESSION_TTL_MS = 30 minutes)
    crypto/       ECDH P-256 + AES-GCM (web + native providers)
    sdk/          Relay client (IRelayClient / ITransport)
  docs/           Architecture, protocol, ADRs, self-hosting
  governance/     Principles, vision, roadmap, decision process
  rfcs/           Protocol change proposals
  security/       Pointers to threat model & disclosure
  examples/       Samples (placeholder)
  tools/          Icon generation and other scripts
  .github/        CI, templates, funding
```

- [Architecture overview](./docs/architecture/overview.md)
- [Threat model](./docs/threat-model.md)
- [Protocol documentation](./docs/protocol/)
- [ADRs](./docs/adr/)

## Getting started

Requires **Node.js 20+** (CI uses 22) and **pnpm 10.34.5**.

```bash
pnpm install
pnpm build:packages
pnpm dev
```

- Reference web client: http://localhost:3000
- Reference relay: `ws://localhost:3001/ws`
- Health: http://localhost:3001/health

`pnpm dev` starts the **web** client and **relay** only. For the mobile reference client:

```bash
cd apps/mobile
pnpm start
```

Session create/join on Android needs a **development build** or the CI APK (`npx expo run:android` / **Actions → Mobile APK**). Expo Go does not include `react-native-quick-crypto`.

A session lasts **30 minutes** from creation (see `SESSION_TTL_MS` in `@goprivate/protocol`). Web and a release APK can talk to each other when both use the same hosted `wss://…/ws` relay.

```bash
pnpm typecheck
pnpm lint
pnpm format          # writes with Prettier
pnpm format:check
pnpm test
pnpm test:coverage
```

## Self-hosting

```bash
docker compose up --build
```

Full guide: [`docs/self-hosting.md`](./docs/self-hosting.md).

Hosted reference deploy (Vercel + Render): [`docs/deploy.md`](./docs/deploy.md).

Sideloadable Android APK: run **Mobile APK** from GitHub Actions (manual only). Details in [`apps/mobile/README.md`](./apps/mobile/README.md).

## Documentation

| Audience                       | Start here                                                                 |
| ------------------------------ | -------------------------------------------------------------------------- |
| Users of the reference clients | [User guide](./docs/user-guide.md) · [Mobile](./apps/mobile/README.md)     |
| Implementers                   | [Protocol docs](./docs/protocol/) · [RFCs](./rfcs/)                       |
| Operators                      | [Self-hosting](./docs/self-hosting.md) · [Deploy](./docs/deploy.md)       |
| Contributors                   | [Contributing](./CONTRIBUTING.md) · [Docs index](./docs/README.md)        |

## Roadmap

Browser MVP → Protocol stabilization → Security audit → Native clients → Federation → Foundation

Details: [`governance/ROADMAP.md`](./governance/ROADMAP.md).

## Contributing

Please read [`CONTRIBUTING.md`](./CONTRIBUTING.md) and the [Code of Conduct](./CODE_OF_CONDUCT.md). Protocol changes should start as [RFCs](./rfcs/).

## Community

- Issues & discussions: [github.com/softlyft/goPrivate](https://github.com/softlyft/goPrivate)
- Support pointers: [`SUPPORT.md`](./SUPPORT.md)
- Security disclosure: [`SECURITY.md`](./SECURITY.md)

## Donations

The public reference relay is funded by people who believe private communication should remain free. There is **no** premium feature set and **no** enterprise edition.

See [`.github/FUNDING.yml`](./.github/FUNDING.yml) (GitHub Sponsors). Optional client link: `NEXT_PUBLIC_SUPPORT_URL`.

## Branch policy

`main` is protected by a GitHub ruleset (see [`.github/git-policy.yml`](./.github/git-policy.yml)):

- No direct pushes — pull requests only
- At least one approving review
- Stale reviews dismissed on new pushes
- Review threads must be resolved
- Linear history (squash/rebase)
- CI job `check` must pass
- No force-push or branch deletion

Apply or refresh on GitHub (needs repo admin):

```bash
pnpm policy:git
```

## License

[GNU Affero General Public License v3.0](./LICENSE).
