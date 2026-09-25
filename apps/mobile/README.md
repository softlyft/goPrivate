# goPrivate Mobile

Reference Expo (SDK 57) client for goPrivate ephemeral 1:1 chat. It uses the same `@goprivate/protocol`, `@goprivate/crypto`, and `@goprivate/sdk` packages as the web app.

## What works

- Create / join a session, PIN vault (SecureStore + PBKDF2), end-to-end ECDH P-256 + AES-GCM
- Chat UI, deep links (`https://goprivate.vercel.app/chat/…`, `goprivate://…`)
- App icon and splash extracted from the official logo (`tools/generate-mobile-icons.mjs`)
- Release APK talks to the **hosted** relay (`wss://goprivate-relay.onrender.com/ws`) so it can chat with production web

**Expo Go cannot create or join sessions.** Native crypto (`react-native-quick-crypto`) is only in a development build or the CI APK.

## Development

### Prerequisites

- Node.js 20+ and pnpm (from the monorepo root)
- iOS: Xcode 14+ (macOS only)
- Android: Android Studio + SDK (for `expo run:android` / emulator)

### Setup

```bash
# from the repository root
pnpm install
pnpm build:packages
cd apps/mobile
pnpm start
```

### Running

```bash
# Expo dev server (Metro)
pnpm start

# Native development build (required for crypto / sessions)
npx expo run:android
npx expo run:ios

# Emulator against a local relay (default in __DEV__)
# ws://10.0.2.2:3001/ws  → host machine port 3001
```

Override the relay at build time with `EXPO_PUBLIC_RELAY_URL`. In `__DEV__`, `ws://` and `wss://` are accepted. Release builds only accept `wss://`; otherwise they fall back to `wss://goprivate-relay.onrender.com/ws`.

## Android APK (CI)

**Mobile APK** is **manual**. Run it from **Actions → Mobile APK → Run workflow** (any branch). It does not run on merge to `main`.

The workflow:

1. Builds `@goprivate/protocol`, `crypto`, and `sdk`
2. Runs `expo prebuild` for Android
3. Assembles a release APK (`assembleRelease`)
4. Uploads `goprivate-android` as a GitHub Actions artifact (30-day retention)

Download it from the Actions run. The APK is signed with the Expo/React Native **debug keystore** so it can be sideloaded; it is not a Play Store upload. For a stable signing key later, use EAS (`eas.json` `preview` profile).

The APK always bakes a remote `wss://` relay: `wss://goprivate-relay.onrender.com/ws`, or `NEXT_PUBLIC_RELAY_URL` when that GitHub secret is already `wss://`. Local `ws://` values are ignored.

Optional cloud build (needs an Expo account and `eas init` for a `projectId`):

```bash
cd apps/mobile
npx eas-cli@latest build -p android --profile preview
```

## Talking to the web client

A sideloaded APK and **production** web (`goprivate.vercel.app`) share the hosted Render relay. Create a session on one, open `https://goprivate.vercel.app/chat/<sessionId>` (or paste the link) on the other.

Local Next.js (`ws://localhost:3001/ws` or a custom `.env.local`) is a **different** relay and will not see APK sessions.

## App structure

```
apps/mobile/
├── app/                    # Expo Router
│   ├── _layout.tsx         # Stack + deep links
│   ├── index.tsx           # Home — create session
│   ├── join.tsx            # Paste link / ID
│   └── chat/[sessionId].tsx
├── components/             # PinPad, MessageList, MessageComposer
├── services/vault.ts       # PIN-wrapped AES vault (SecureStore)
├── store/session.ts
├── utils/env.ts            # getRelayUrl()
└── assets/                 # Icon, splash, logo
```

## Deep links

- HTTPS: `https://goprivate.vercel.app/chat/{sessionId}`
- Custom scheme: `goprivate://chat/{sessionId}`

Package / bundle id: `com.goprivate.mobile`. See [docs/mobile/DEEP_LINKING.md](../../docs/mobile/DEEP_LINKING.md).
