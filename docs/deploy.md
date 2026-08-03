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

### One-time setup

1. Create a Vercel account (Hobby is fine).
2. Install the CLI locally and log in:

```bash
npm i -g vercel
vercel login
```

3. From the repo, link the web app (creates the project **without** connecting the org GitHub app):

```bash
cd apps/web
vercel link
```

- Set **Root Directory** to `apps/web` when asked (or confirm if detected).
- Say yes to linking / creating the project.

4. Copy IDs from `apps/web/.vercel/project.json`:

```json
{
  "orgId": "team_...",
  "projectId": "prj_..."
}
```

(Do **not** commit `.vercel/` — it should stay local / gitignored.)

5. Create a Vercel token: [Account → Tokens](https://vercel.com/account/tokens).

6. In the Vercel project → **Settings → Environment Variables**, add for Production:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_RELAY_URL` | `wss://<your-render-service>.onrender.com/ws` |

7. In GitHub → repo → **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|--------|--------|
| `VERCEL_TOKEN` | Token from step 5 |
| `VERCEL_ORG_ID` | `orgId` from `project.json` |
| `VERCEL_PROJECT_ID` | `projectId` from `project.json` |
| `NEXT_PUBLIC_RELAY_URL` | Same `wss://…/ws` URL (used at build time in CI) |

8. Push to `main` (or run the workflow manually under **Actions**).

The workflow `.github/workflows/deploy-vercel.yml` uploads the repo and runs a **remote Vercel build** (`vercel deploy --prod`). It does not use `--prebuilt`, which breaks with pnpm’s `node_modules` layout.

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
