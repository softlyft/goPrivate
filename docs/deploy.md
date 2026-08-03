# Deploy goPrivate (free): Vercel + Render

## Overview

| Piece | Host | Config |
|-------|------|--------|
| Web (Next.js) | [Vercel](https://vercel.com) | `apps/web/vercel.json` (Root Directory: `apps/web`) |
| Relay (WebSocket) | [Render](https://render.com) | `render.yaml` |

Deploy the **relay first**, then the web app (the web app needs the relay’s `wss://` URL).

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

## 2. Web on Vercel

1. In Vercel: **Add New** → **Project** → import the same GitHub repo.
2. Set **Root Directory** to `apps/web` (Edit → select that folder).
3. Framework Preset: **Next.js** (uses `apps/web/vercel.json`).
4. Add environment variable:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_RELAY_URL` | `wss://<your-render-service>.onrender.com/ws` |

5. Deploy.

6. Open the Vercel URL and create a session to verify.

If you change the Render URL later, update `NEXT_PUBLIC_RELAY_URL` and **redeploy** Vercel (the value is baked in at build time).

---

## 3. Quick smoke check

1. Visit the Vercel site.
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
