# Self-hosting

Self-hosting is a first-class deployment option. You can run the **reference relay** and **reference client** on your own infrastructure.

## Quick path: Docker Compose

From the repository root:

```bash
docker compose up --build
```

- Reference client: http://localhost:3000
- Reference relay WebSocket: `ws://localhost:3001/ws`
- Health: http://localhost:3001/health

The Compose file sets `NEXT_PUBLIC_RELAY_URL=ws://localhost:3001/ws` for the web container.

## Local development (without Docker)

```bash
pnpm install
pnpm build:packages
pnpm dev
```

Or run packages/apps individually — see the root [README](../README.md).

## Environment variables

### Reference relay (`apps/relay`)

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `PORT` | `3001` | HTTP / WebSocket listen port |
| `HOST` | `0.0.0.0` | Bind address |
| `NODE_ENV` | — | Set `production` in deployed environments |

### Reference client (`apps/web`)

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `NEXT_PUBLIC_RELAY_URL` | `ws://localhost:3001/ws` | WebSocket URL (`ws://` or `wss://`, must include `/ws`) |
| `NEXT_PUBLIC_SUPPORT_URL` | unset | Optional link for “Support goPrivate” on the conversation-ended screen |

`NEXT_PUBLIC_*` values are baked in at **build** time for Next.js.

## Relay configuration notes

- Sessions are **in-memory only** — process restarts wipe active conversations
- Payload, rate-limit, and connection caps are defined in `@goprivate/protocol`
- Health endpoint returns `{ "status": "ok", "ok": true }` (no session count)

## Reverse proxy and TLS

Terminate TLS in front of the relay (Caddy, nginx, Traefik, etc.) and proxy WebSockets to the Node process.

Example nginx sketch:

```nginx
location /ws {
  proxy_pass http://127.0.0.1:3001/ws;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_read_timeout 86400;
}

location /health {
  proxy_pass http://127.0.0.1:3001/health;
}
```

Clients must use `wss://your.domain/ws` when TLS is enabled.

## Hosted reference deploy

For the project’s free Vercel + Render setup, see [deploy.md](./deploy.md).
