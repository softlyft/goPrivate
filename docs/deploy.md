# Deploy goPrivate (free): Vercel + Render

## Overview

| Piece             | Host                                                | Config                                |
| ----------------- | --------------------------------------------------- | ------------------------------------- |
| Web (Next.js)     | [Vercel](https://vercel.com) via **GitHub Actions** | `.github/workflows/deploy-vercel.yml` |
| Relay (WebSocket) | [Render](https://render.com)                        | `render.yaml`                         |

Deploy the **relay first**, then the web app (the web app needs the relay’s `wss://` URL).

> **Org GitHub + Vercel Hobby:** Vercel’s one-click GitHub integration often requires Pro for organization repos. Use the GitHub Action + Vercel token instead — Hobby is enough.

---

## Relay URL format (important)

| Purpose                                 | Scheme           | Example                                       |
| --------------------------------------- | ---------------- | --------------------------------------------- |
| Browser / health check                  | `https://`       | `https://goprivate-relay.onrender.com/health` |
| App WebSocket (`NEXT_PUBLIC_RELAY_URL`) | `wss://` + `/ws` | `wss://goprivate-relay.onrender.com/ws`       |

Do **not** put the HTTPS homepage URL in `NEXT_PUBLIC_RELAY_URL`. The client opens a WebSocket; it must be `wss://…/ws`.

Quick checks:

```bash
curl -sS https://goprivate-relay.onrender.com/health
# {"status":"ok","ok":true}

# Optional: Node smoke (needs `ws` or use any WebSocket client)
node -e "const W=require('ws');const s=new W('wss://goprivate-relay.onrender.com/ws');s.on('open',()=>{console.log('ok');s.close()});s.on('error',e=>console.error(e))"
```

---

## 1. Relay on Render

1. Push this repo to GitHub.
2. In Render: **New** → **Blueprint** → select the repo (uses `render.yaml`).
3. Create the `goprivate-relay` service on the **free** plan.
4. Wait for the deploy to finish.
5. Note the service hostname (e.g. `goprivate-relay.onrender.com`).
6. Confirm health: `https://<hostname>/health`
7. Your WebSocket URL is:

```text
wss://<hostname>/ws
```

Example for this project’s relay:

```text
wss://goprivate-relay.onrender.com/ws
```

**Note:** Free Render services sleep when idle. The first connection after sleep can take ~30–60s, and any in-memory sessions are lost on sleep (fine for ephemeral chat).

---

## 2. Web on Vercel (GitHub Actions)

### Fix “No Next.js version detected”

That error means Vercel’s Root Directory is wrong (often linked from `apps/web` _and_ set to `apps/web`, so it looks for `apps/web/apps/web`).

**Re-link from the monorepo root:**

```bash
cd /path/to/goPrivate
rm -rf .vercel apps/web/.vercel
vercel login
vercel link
```

When prompted, set **Root Directory** to `apps/web`.

In the Vercel dashboard → Project → **Settings → General → Root Directory**: confirm it is `apps/web`.

Update GitHub secrets `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` from the new root `.vercel/project.json` if they changed.

### One-time setup

1. Create a Vercel account (Hobby is fine).
2. Install the CLI and log in: `npm i -g vercel && vercel login`
3. From the **repo root**, run `vercel link` with Root Directory `apps/web` (see above).
4. Copy `orgId` / `projectId` from `.vercel/project.json` (repo root).
5. Create a token: [vercel.com/account/tokens](https://vercel.com/account/tokens)
6. Vercel project env (Production):

| Name                    | Value                                                      |
| ----------------------- | ---------------------------------------------------------- |
| `NEXT_PUBLIC_RELAY_URL` | `wss://goprivate-relay.onrender.com/ws` (or your hostname) |

7. GitHub → **Settings → Secrets and variables → Actions**:

| Secret                  | Value                          |
| ----------------------- | ------------------------------ |
| `VERCEL_TOKEN`          | Vercel token                   |
| `VERCEL_ORG_ID`         | `orgId`                        |
| `VERCEL_PROJECT_ID`     | `projectId`                    |
| `NEXT_PUBLIC_RELAY_URL` | Same `wss://…/ws` URL as above |

8. Push to `main` or run the workflow manually (**Deploy Web to Vercel**).

### How the Action deploys

The Action checks out the **full monorepo**, then from the **repo root** runs:

1. `pnpm install`
2. `vercel pull`
3. `vercel build --prod`
4. `vercel deploy --prebuilt --prod`

Vercel project **Root Directory** must stay `apps/web`. Always run the Vercel CLI from the monorepo root in CI — not from `apps/web`. Running inside `apps/web` makes `--prebuilt` look for pnpm paths under the app folder and fail (e.g. missing `@swc/helpers`).

`.npmrc` uses `node-linker=hoisted` so the prebuilt upload matches what the CLI expects.

### Updating the relay URL later

1. Change `NEXT_PUBLIC_RELAY_URL` in **both** Vercel project env and the GitHub Actions secret.
2. Re-run the deploy workflow (or push a commit that triggers it).

`NEXT_PUBLIC_*` is baked in at build time — changing the secret alone without a redeploy will not update the client.

---

## 3. Local development against the hosted relay

Default local stack uses a relay on your machine (`pnpm dev` → `ws://localhost:3001/ws`).

To point the **local** Next app at Render instead, set `apps/web/.env.local`:

```bash
NEXT_PUBLIC_RELAY_URL=wss://goprivate-relay.onrender.com/ws
```

Restart `pnpm --filter @goprivate/web dev` after changing it (Next only reads `NEXT_PUBLIC_*` on startup).

| Environment          | `NEXT_PUBLIC_RELAY_URL`                 |
| -------------------- | --------------------------------------- |
| Local + local relay  | `ws://localhost:3001/ws`                |
| Local + Render relay | `wss://goprivate-relay.onrender.com/ws` |
| Production (Vercel)  | `wss://goprivate-relay.onrender.com/ws` |

---

## 4. Quick smoke check

1. Visit the Vercel URL from the Action summary (or http://localhost:3000).
2. Create a session (set PIN).
3. Open the share link in another browser / incognito.
4. Confirm status becomes **Encrypted** and messages work.

### “WebSocket connection failed”

- Wrong scheme or path — must be `wss://…/ws`, not `https://…` and not missing `/ws`
- Local app still on `ws://localhost:3001/ws` while the relay isn’t running — fix `.env.local` or start the relay
- Production build still has an old URL — update Vercel env **and** GitHub secret, then **redeploy**
- Relay sleeping on Render free tier — the client retries for about a minute; confirm `https://<relay>/health` returns OK

### Create hangs on “Creating…” / “Waking relay”

Cold start is the usual cause on free Render. Wait for retries to finish, or hit `/health` once to wake the service, then try again.
