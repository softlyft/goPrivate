# Deep Linking Setup for goPrivate Mobile

This document explains how deep linking works in the goPrivate mobile app and how to configure it for production.

## Overview

Deep linking allows users to open goPrivate session links directly in the mobile app (if installed) instead of the web browser. This provides a seamless experience when sharing session invitations.

## How It Works

### User Flow

**App Installed:**

1. User receives link: `https://goprivate.app/chat/abc123`
2. User clicks link
3. **Mobile app opens directly** with the session loaded
4. User is ready to chat

**App Not Installed:**

1. User receives link: `https://goprivate.app/chat/abc123`
2. User clicks link
3. **Web browser opens** to the web version
4. User can join via web or download app

## Supported Link Formats

### 1. HTTPS Links (Universal/App Links)

```
https://goprivate.app/chat/[sessionId]
https://www.goprivate.app/chat/[sessionId]
```

**Best for:**

- Sharing via messaging apps
- Email invitations
- Web-to-app transitions
- Works on both iOS and Android

### 2. Custom Scheme Links

```
goprivate://chat/[sessionId]
goprivate://[sessionId]
```

**Best for:**

- App-to-app communication
- Custom integrations
- Fallback mechanism

## Platform Configuration

### iOS (Universal Links)

**Requirements:**

1. Apple Developer Team ID
2. Associated Domains capability
3. Apple App Site Association file

**Configuration:**

1. **app.json** - Already configured:

```json
"ios": {
  "bundleIdentifier": "com.goprivate.mobile",
  "associatedDomains": [
    "applinks:goprivate.app",
    "applinks:www.goprivate.app"
  ]
}
```

2. **Apple App Site Association** file:

- Location: `apps/web/.well-known/apple-app-site-association`
- Must be served at: `https://goprivate.app/.well-known/apple-app-site-association`
- Content-Type: `application/json`
- No file extension
- Must be accessible without authentication

3. **Update Team ID:**
   Replace `TEAM_ID` in the AASA file with your Apple Developer Team ID:

```json
{
  "appID": "YOUR_TEAM_ID.com.goprivate.mobile"
}
```

**Finding Your Team ID:**

- Log in to [Apple Developer](https://developer.apple.com)
- Go to Membership section
- Your Team ID is displayed there (10 characters, e.g., `ABC123DEFG`)

### Android (App Links)

**Requirements:**

1. SHA-256 certificate fingerprint
2. Digital Asset Links file
3. App signing key

**Configuration:**

1. **app.json** - Already configured:

```json
"android": {
  "package": "com.goprivate.mobile",
  "intentFilters": [
    {
      "action": "VIEW",
      "autoVerify": true,
      "data": [
        {
          "scheme": "https",
          "host": "goprivate.app",
          "pathPrefix": "/chat"
        }
      ],
      "category": ["BROWSABLE", "DEFAULT"]
    }
  ]
}
```

2. **Digital Asset Links** file:

- Location: `apps/web/.well-known/assetlinks.json`
- Must be served at: `https://goprivate.app/.well-known/assetlinks.json`
- Content-Type: `application/json`
- Must be accessible without authentication

3. **Get SHA-256 Fingerprint:**

For debug builds:

```bash
cd apps/mobile
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep "SHA256"
```

For release builds:

```bash
keytool -list -v -keystore your-release-key.keystore -alias your-alias | grep "SHA256"
```

4. **Update assetlinks.json:**
   Replace `REPLACE_WITH_YOUR_SHA256_FINGERPRINT` with your actual SHA-256 fingerprint (with colons removed).

## Web Server Setup

### 1. Serve Well-Known Files

**Next.js (apps/web):**

The `.well-known` folder should be in `public/.well-known/`:

```
apps/web/
├── public/
│   └── .well-known/
│       ├── apple-app-site-association (no extension!)
│       └── assetlinks.json
```

**Vercel Deployment:**
Files in `public/` are automatically served. Verify at:

- https://goprivate.app/.well-known/apple-app-site-association
- https://goprivate.app/.well-known/assetlinks.json

### 2. Content-Type Headers

Ensure proper headers in `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: '/.well-known/apple-app-site-association',
      headers: [
        {
          key: 'Content-Type',
          value: 'application/json',
        },
      ],
    },
    {
      source: '/.well-known/assetlinks.json',
      headers: [
        {
          key: 'Content-Type',
          value: 'application/json',
        },
      ],
    },
  ];
}
```

## Testing Deep Links

### iOS Simulator

1. **Using Safari:**

```bash
xcrun simctl openurl booted "https://goprivate.app/chat/test123"
```

2. **Using Custom Scheme:**

```bash
xcrun simctl openurl booted "goprivate://chat/test123"
```

3. **Using Notes App:**

- Open Notes app in simulator
- Type the link and tap it
- App should open

### Android Emulator

1. **Using ADB:**

```bash
adb shell am start -W -a android.intent.action.VIEW -d "https://goprivate.app/chat/test123" com.goprivate.mobile
```

2. **Using Custom Scheme:**

```bash
adb shell am start -W -a android.intent.action.VIEW -d "goprivate://chat/test123" com.goprivate.mobile
```

3. **Using Chrome:**

- Open Chrome in emulator
- Navigate to: `https://goprivate.app/chat/test123`
- Tap the link or press back
- Should see "Open with goPrivate" option

### Real Devices

1. **Send Link via Messages/WhatsApp:**

- Send yourself: `https://goprivate.app/chat/test123`
- Tap the link
- Should open app directly

2. **Verify AASA/Asset Links:**

**iOS:**

```bash
# Check if AASA is valid
curl https://goprivate.app/.well-known/apple-app-site-association

# Validate format
https://branch.io/resources/aasa-validator/
```

**Android:**

```bash
# Check if assetlinks.json is valid
curl https://goprivate.app/.well-known/assetlinks.json

# Validate format
https://developers.google.com/digital-asset-links/tools/generator
```

## Development vs Production

### Development

- Custom scheme works: `goprivate://chat/test123`
- Universal/App Links may not work (requires HTTPS domain)
- Test with custom scheme during development

### Production

- Universal/App Links work: `https://goprivate.app/chat/abc123`
- Custom scheme still works as fallback
- Requires proper server configuration

## Troubleshooting

### iOS Issues

**Links open in Safari instead of app:**

1. Verify AASA file is accessible
2. Check Team ID is correct
3. Ensure app is installed and signed
4. Try deleting and reinstalling app
5. Check Associated Domains entitlement

**Check AASA Status:**

```bash
# iOS maintains a CDN cache
# Wait up to 24 hours or reset:
Settings > Developer > Reset Universal Links
```

### Android Issues

**Links open in browser instead of app:**

1. Verify assetlinks.json is accessible
2. Check SHA-256 fingerprint is correct
3. Ensure `autoVerify: true` in intent filter
4. Clear app defaults: Settings > Apps > goPrivate > Open by default > Clear defaults

**Check App Links Status:**

```bash
adb shell dumpsys package domain-preferred-apps
```

### General Issues

**Deep links not working at all:**

1. Check `_layout.tsx` deep link handlers
2. Verify `parseDeepLink()` function
3. Check console logs for errors
4. Test with custom scheme first
5. Ensure Expo Linking module is imported

## Code Reference

### Deep Link Parsing

```typescript
// apps/mobile/utils/deeplink.ts
export function parseDeepLink(url: string): {
  sessionId: string | null;
  path: string;
};
```

### Navigation Handling

```typescript
// apps/mobile/app/_layout.tsx
Linking.addEventListener('url', ({ url }) => {
  const { path } = parseDeepLink(url);
  router.push(path);
});
```

### Share Button

```typescript
// apps/mobile/components/ShareButton.tsx
const shareUrl = `https://goprivate.app/chat/${sessionId}`;
await Share.share({ message: shareMessage, url: shareUrl });
```

## Security Considerations

### Domain Verification

- iOS: Apple verifies AASA file ownership
- Android: Google verifies assetlinks.json
- Both ensure only your app can claim your domain

### SSL/TLS Required

- Universal/App Links require HTTPS
- Certificate must be valid
- No self-signed certificates

### Path Restrictions

- Only `/chat/*` paths are claimed by the app
- Other paths (e.g., `/guide`) open in browser
- Prevents app from hijacking entire domain

## Deployment Checklist

### Before Release

- [ ] Update Apple Developer Team ID in AASA file
- [ ] Generate release SHA-256 fingerprint for Android
- [ ] Update assetlinks.json with release fingerprint
- [ ] Upload AASA and assetlinks.json to web server
- [ ] Verify files are accessible via HTTPS
- [ ] Test on real iOS device with TestFlight
- [ ] Test on real Android device with internal testing
- [ ] Verify deep links work from Messages/WhatsApp
- [ ] Check analytics for deep link attribution (optional)

### After Release

- [ ] Monitor deep link success rate
- [ ] Check server logs for AASA/assetlinks requests
- [ ] Test with different sharing apps
- [ ] Verify fallback to web works
- [ ] Update documentation with actual Team ID

## Resources

**iOS Universal Links:**

- [Apple Documentation](https://developer.apple.com/ios/universal-links/)
- [AASA Validator](https://branch.io/resources/aasa-validator/)

**Android App Links:**

- [Google Documentation](https://developer.android.com/training/app-links)
- [Asset Links Generator](https://developers.google.com/digital-asset-links/tools/generator)

**Expo Linking:**

- [Expo Documentation](https://docs.expo.dev/guides/linking/)
- [Expo Router Deep Linking](https://docs.expo.dev/router/reference/deep-linking/)

## Support

For issues with deep linking:

1. Check this documentation
2. Review console logs in app
3. Verify server configuration
4. Test with custom scheme first
5. Consult Expo and platform documentation
