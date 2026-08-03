# Deploy goPrivate (free): Vercel + Render

## Overview

| Piece | Host | Config |
|-------|------|--------|
| Web (Next.js) | [Vercel](https://vercel.com) via **GitHub Actions** | `.github/workflows/deploy-vercel.yml` |
| Relay (WebSocket) | [Render](https://render.com) | `render.yaml` |

Deploy the **relay first**, then the web app (the web app needs the relay’s `wss://` URL).

> **Org GitHub + Vercel Hobby:** Vercel’s one-click GitHub integration often requires Pro for organization repos. Use the GitHub Action + Vercel token instead — Hobby is enough.

---

## 1. Relay on Render

1. Push this repo to GitHub.
2. In Render: **New** → **Blueprint** → select the repo (uses `render.yaml`).
3. Create the `goprivate-relay` service on the **free** plan.
4. Wait for the deploy to finish.
5. Open the service URL, e.g. `https://goprivate-relay.onrender.com`.
6. Check health: `https://goprivate-relay.onrender.com/health`
7. Your WebSocket URL is:

```text
wss://goprivate-relay.onrender.com/ws
```

(Replace with your real hostname.)

**Note:** Free Render services sleep when idle. The first connection after sleep can take ~30–60s, and any in-memory sessions are lost on sleep (fine for ephemeral chat).

---

## 2. Web on Vercel (GitHub Actions)

### Fix “No Next.js version detected”

That error means Vercel’s Root Directory is wrong (often linked from `apps/web` *and* set to `apps/web`, so it looks for `apps/web/apps/web`).

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

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_RELAY_URL` | `wss://<your-render-service>.onrender.com/ws` |

7. GitHub → **Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|--------|
| `VERCEL_TOKEN` | Vercel token |
| `VERCEL_ORG_ID` | `orgId` |
| `VERCEL_PROJECT_ID` | `projectId` |
| `NEXT_PUBLIC_RELAY_URL` | Same `wss://…/ws` URL |

8. Push to `main` or run the workflow manually.

The Action deploys from the **repo root** (full monorepo). Vercel builds using Root Directory `apps/web`.

### Updating the relay URL later

1. Change `NEXT_PUBLIC_RELAY_URL` in Vercel project env **and** the GitHub Action secret.
2. Re-run the deploy workflow (or push a commit).

---

## 3. Quick smoke check

1. Visit the Vercel URL from the Action summary.
2. Create a session (set PIN).
3. Open the share link in another browser / incognito.
4. Confirm status becomes **Encrypted** and messages work.

If create hangs on “Creating…”:
- Relay may be waking from sleep — wait and retry
- Confirm `NEXT_PUBLIC_RELAY_URL` uses `wss://` and ends with `/ws`
- Confirm `https://<relay>/health` returns OK

---

## Local vs production env

| Environment | `NEXT_PUBLIC_RELAY_URL` |
|-------------|-------------------------|
| Local | `ws://localhost:3001/ws` |
| Production | `wss://<render-host>/ws` |
