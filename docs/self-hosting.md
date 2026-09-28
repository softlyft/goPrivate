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

| Variable               | Default                                       | Purpose                                                                                                |
| ---------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `PORT`                 | `3001`                                        | HTTP / WebSocket listen port                                                                           |
| `HOST`                 | `0.0.0.0`                                     | Bind address                                                                                           |
| `NODE_ENV`             | —                                             | Set `production` in deployed environments                                                              |
| `ALLOWED_ORIGINS`      | unset                                         | Extra CORS origins (comma-separated). Localhost is always allowed so local web can use a hosted relay. |
| `HANDLE_CLAIM_SECRET`  | unset                                         | If set, `CLAIM_HANDLE` for **unregistered** names must include this secret.                            |
| `HANDLE_REGISTRY_PATH` | `handles.json` in the relay working directory | JSON map of reserved names → `{ publicKey, expiresAt }`. Reloaded on each claim.                       |

### Reference client (`apps/web`)

| Variable                          | Default                  | Purpose                                                                               |
| --------------------------------- | ------------------------ | ------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_RELAY_URL`           | `ws://localhost:3001/ws` | WebSocket URL (`ws://` or `wss://`, must include `/ws`)                               |
| `NEXT_PUBLIC_SUPPORT_URL`         | unset                    | Optional link for “Support goPrivate” on the conversation-ended screen                |
| `NEXT_PUBLIC_HANDLE_CLAIM_SECRET` | unset                    | Same value as relay `HANDLE_CLAIM_SECRET` if the operator requires it to claim a name |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`   | unset                    | Optional GA4 id (`G-…`); loads analytics on the home page only                        |

### Reference mobile client (`apps/mobile`)

| Variable                          | Default                                                    | Purpose                                                                                          |
| --------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `EXPO_PUBLIC_RELAY_URL`           | Dev: `ws://10.0.2.2:3001/ws`. Release: hosted `wss://…/ws` | Relay URL. Release APKs reject `ws://` and fall back to `wss://goprivate-relay.onrender.com/ws`. |
| `EXPO_PUBLIC_HANDLE_CLAIM_SECRET` | unset                                                      | Same value as relay `HANDLE_CLAIM_SECRET` if the operator requires it to claim a name            |

`NEXT_PUBLIC_*` values are baked in at **build** time for Next.js. `EXPO_PUBLIC_*` is baked in at APK / native build time.

Sessions last **30 minutes** (`SESSION_TTL_MS` in `@goprivate/protocol`). They live in memory only.

## Relay configuration notes

- Sessions are **in-memory only** — process restarts wipe active conversations and claimed handles
- Lasting `/{handle}` links are presence mailboxes. Reserve a name (and who currently owns it) in `apps/relay/handles.json` via `pnpm handle:issue <name> --days 30`. Commit the JSON (public key + expiry only). Send the printed private key to the assignee; they paste it once in the app. When the lease expires, issue a new key to the next person — hire/rehire without changing the URL.
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
