# Tools

- `issue-handle.mjs` — operator issues a time-limited handle lease. From the repo root: `pnpm handle:issue alice --days 30`. Writes the public key into `apps/relay/handles.json` and prints the private key once for the assignee.
- `generate-mobile-icons.mjs` — crop the official logo (`apps/mobile/assets/images/logo.jpg`) into Expo icon, Android adaptive layers, splash, and favicon. Run from the repo root: `node tools/generate-mobile-icons.mjs` (needs `sharp`).

Smoke tests live in `scripts/` (`pnpm smoke:crypto`, `pnpm smoke:relay`).
