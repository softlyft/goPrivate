# goPrivate

Ephemeral end-to-end encrypted messaging. No accounts. No history. The relay never sees plaintext.

## Monorepo

```
goprivate/
  apps/
    web/       Next.js client
    relay/     Fastify WebSocket relay
  packages/
    protocol/  Shared event & message types
    crypto/    Web Crypto ECDH + AES-GCM (ICryptoProvider)
    sdk/       Browser relay client (IRelayClient / ITransport)
  docs/
    architecture.md
    user-guide.md
```

## Docs

- [User Guide](docs/user-guide.md) — for people using the app
- [Architecture](docs/architecture.md) — for developers
- [Deploy (Vercel + Render)](docs/deploy.md) — free hosting

## Quick start

```bash
pnpm install
pnpm --filter @goprivate/protocol build
pnpm --filter @goprivate/crypto build
pnpm --filter @goprivate/sdk build
pnpm dev
```

## Scripts

```bash
pnpm typecheck   # TypeScript across all packages/apps
pnpm lint        # ESLint (web) + tsc (packages/relay)
pnpm format      # Prettier — writes files in place
pnpm format:check # Prettier — validate only (CI)
pnpm test
pnpm test:coverage
```

- Web: http://localhost:3000
- Relay WebSocket: `ws://localhost:3001/ws`
- Health: http://localhost:3001/health

To use the hosted Render relay from local Next.js, set in `apps/web/.env.local`:

```bash
NEXT_PUBLIC_RELAY_URL=wss://goprivate-relay.onrender.com/ws
```

See [docs/deploy.md](docs/deploy.md) for Vercel + Render setup and URL format rules (`wss://…/ws`, not `https://`).

## Docker

```bash
docker compose up --build
```

## MVP flow

1. Open the site and click **Create Session**
2. Copy the share link
3. Open the link in another browser / incognito window
4. Exchange encrypted messages
5. Leave — the relay destroys the in-memory session

## Not in MVP

Auth, accounts, contacts, database, media, typing indicators, persistence.
