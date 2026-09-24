# goPrivate Mobile

React Native mobile app for goPrivate ephemeral messaging.

## Development

### Prerequisites

- Node.js 20+
- pnpm
- iOS: Xcode 14+ (macOS only)
- Android: Android Studio + SDK

### Setup

```bash
# Install dependencies (from workspace root)
cd /workspace
pnpm install

# Start the Expo dev server
cd apps/mobile
pnpm start
```

### Running

```bash
# iOS Simulator (macOS only)
pnpm ios

# Android Emulator
pnpm android

# Web (for quick testing)
pnpm web

# Expo Go on physical device
# Scan QR code from `pnpm start`
```

## Android APK (CI)

Merges to `main` that touch the mobile app or shared packages run **Mobile APK**. The workflow:

1. Builds `@goprivate/protocol`, `crypto`, and `sdk`
2. Runs `expo prebuild` for Android
3. Assembles a release APK (`assembleRelease`)
4. Uploads `goprivate-android` as a GitHub Actions artifact (30-day retention)

Download it from the Actions run. The APK is signed with the Expo/React Native **debug keystore** so it can be sideloaded; it is not a Play Store upload. For a stable signing key later, use EAS credentials (`eas.json` `preview` profile builds an APK).

Optional GitHub secret (same as web):

| Secret                  | Purpose                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_RELAY_URL` | Used for the APK only when it is a `wss://` URL. Otherwise the APK is baked with `wss://goprivate-relay.onrender.com/ws` |

Optional cloud build (needs an Expo account and `eas init` for a `projectId`):

```bash
cd apps/mobile
npx eas-cli@latest build -p android --profile preview
```

## Architecture

### Shared Packages

- `@goprivate/protocol` - Types and constants (100% shared)
- `@goprivate/crypto` - Cryptography with platform adapter
- `@goprivate/sdk` - WebSocket client (95% shared)

### App Structure

```
apps/mobile/
├── app/                    # Expo Router pages
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Home screen
│   ├── join.tsx           # Join session
│   └── chat/
│       └── [sessionId].tsx
├── components/
│   └── PinPad.tsx         # Native PIN input
├── store/
│   └── session.ts         # Zustand state
└── services/
    └── vault.ts           # Vault encryption (TODO)
```

## Phase 1 Status ✅

- ✅ Expo app with Router setup
- ✅ Platform-specific crypto adapter (placeholder)
- ✅ Zustand session store ported
- ✅ Native PIN pad component
- ⏸️ WebSocket connection (needs testing)
- ⏸️ Vault implementation (needs SecureStore)

## Next Steps (Phase 2)

1. Implement native vault with SecureStore
2. Add WebSocket connection testing
3. Port chat UI components
4. Implement message encryption/decryption
5. Add app state management (background/foreground)
6. Implement deep linking

## Deep Linking

### Universal Links

- iOS: `https://goprivate.app/chat/{sessionId}`
- Android: `https://goprivate.app/chat/{sessionId}`

### Custom Scheme

- Both: `goprivate://chat/{sessionId}`

## Known Limitations

### Phase 1 (Current)

- ⚠️ Crypto operations throw (native ECDH not implemented yet)
- ⚠️ No vault encryption (SecureStore integration needed)
- ⚠️ Basic UI only (no animations)
- ⚠️ No background app state handling

### To Implement

- Full ECDH P-256 with `react-native-quick-crypto`
- AES-GCM encryption with Expo Crypto
- Vault storage with SecureStore
- Biometric unlock (optional)
- Push notifications for expiring sessions (optional)
