# Web vs Mobile Feature Parity Audit

**Date**: September 29, 2026  
**Auditor**: Cloud Agent Feature Review  
**Scope**: Web vs Mobile feature comparison

---

## Executive Summary

The web and mobile apps have **significant feature gaps**. Recent "multi-chat" features (PRs #32-#41) added substantial functionality to web, but **mobile is missing critical features**, particularly the **Settings UI**.

### Feature Parity: **~65%** 🟡

**Missing on Mobile:**
- 🔴 **Settings UI** (PIN management, preferences)
- 🟡 **Claimed Handles** (profile system)
- 🟡 **About page**
- 🟡 Some UI polish

**Present on Both:**
- ✅ Multi-chat / Conversations list
- ✅ PIN setup on first use
- ✅ Message encryption/decryption
- ✅ Deep linking

---

## Detailed Feature Comparison

### 1. Settings & Preferences

#### Web: ✅ **COMPLETE**

**File:** `apps/web/src/components/SettingsControl.tsx`

**Features:**
```typescript
1. PIN Management
   - Set initial PIN
   - Change existing PIN
   - Verify current before change
   - Stored locally per device

2. Message Scrambling Toggle
   - "Scramble messages" on/off
   - Hides older chat text on screen
   - Persisted in device settings
```

**UI:**
- Settings icon (gear) in header
- Modal overlay with settings panel
- Clean, accessible interface
- Grouped settings by category

#### Mobile: ❌ **MISSING**

**Current State:**
- No settings UI at all
- No way to change PIN after initial setup
- No preference controls
- No settings icon/button

**Impact:**
- 🔴 **HIGH**: Users cannot change their PIN
- 🔴 **HIGH**: No control over message scrambling
- 🟡 **MEDIUM**: Poor UX parity with web

---

### 2. Multi-Chat Features

#### Web: ✅ **COMPLETE**

**Recent PRs:** #32-#41 (Multi-chat feature)

**Files:**
- `apps/web/src/components/ConversationsPage.tsx`
- `apps/web/src/components/ConversationList.tsx`
- `apps/web/src/app/chats/page.tsx`

**Features:**
- Conversations inbox view
- List of active chats
- Navigate between chats
- Concurrent chat limit hints
- "Start new" and "Join" actions

#### Mobile: ✅ **COMPLETE**

**File:** `apps/mobile/app/chats.tsx`

**Features:**
- Conversations inbox view
- List of active chats
- Navigate between chats
- Same concurrent limit logic
- "Start new" and "Join" buttons

**Status:** ✅ Feature parity achieved

---

### 3. Handles / Profile System

#### Web: ✅ **COMPLETE**

**Files:**
- `apps/web/src/components/ClaimHandleControl.tsx`
- `apps/web/src/components/HandlePage.tsx`
- `apps/web/src/app/[handle]/page.tsx`

**Features:**
- Claim a unique handle
- Profile page at `/{handle}`
- Share profile link
- Higher concurrent chat limit with handle

#### Mobile: ⚠️ **PARTIAL**

**Files:**
- `apps/mobile/components/ClaimHandleCard.tsx`
- `apps/mobile/app/[handle].tsx`

**Features:**
- Claim handle UI exists
- Handle page exists
- Same backend logic

**Gaps:**
- 🟡 Less polish than web
- 🟡 May need UX improvements

---

### 4. About / Guide Pages

#### Web: ✅ **COMPLETE**

**Files:**
- `apps/web/src/app/about/page.tsx`
- `apps/web/src/app/guide/page.tsx`
- `apps/web/src/components/MarketingPage.tsx`

**Features:**
- About page with project info
- User guide
- Marketing content

#### Mobile: ❌ **MISSING**

**Current State:**
- No about page
- No guide page
- Limited onboarding

---

### 5. Core Chat Features

#### Both Platforms: ✅ **COMPLETE**

**Features Present on Both:**

1. **Session Management**
   - Create new session
   - Join via link/ID
   - Deep linking
   - Session timer
   - Leave/expire

2. **Messaging**
   - Send/receive messages
   - E2E encryption
   - Message vault (PIN-encrypted storage)
   - Message bubbles (peer vs self)
   - Message composer

3. **PIN/Vault**
   - Initial PIN setup
   - Vault unlock
   - Message encryption/decryption
   - Secure storage

4. **Connection Status**
   - Status indicators
   - Partner presence
   - Reconnection logic
   - Error handling

---

## Missing Components Inventory

### High Priority 🔴

1. **Settings UI on Mobile**
   ```
   Missing: apps/mobile/components/SettingsControl.tsx
   
   Required Features:
   - PIN change functionality
   - Scramble messages toggle
   - Device settings management
   ```

2. **Device Settings Service on Mobile**
   ```
   Missing: apps/mobile/services/device-settings.ts
   
   Required:
   - Save/load scramble preference
   - Persist device settings
   - Settings hook
   ```

### Medium Priority 🟡

3. **About/Guide Pages on Mobile**
   ```
   Missing:
   - apps/mobile/app/about.tsx
   - apps/mobile/app/guide.tsx
   ```

4. **Marketing Content on Mobile**
   ```
   Missing: Marketing/landing screens
   Currently just functional screens
   ```

### Low Priority 🟢

5. **UI Polish Gaps**
   - Handle claiming UX refinement
   - Animation consistency
   - Icon consistency

---

## File-by-File Comparison

### Web Components (25 files)

```
✅ AppShell.tsx
✅ BrandMark.tsx
✅ ChatPage.tsx
✅ ClaimHandleControl.tsx
✅ ConnectionStatus.tsx
✅ ConversationEnded.tsx
✅ ConversationList.tsx
✅ ConversationsPage.tsx
✅ CreateSessionButton.tsx
✅ GuidePage.tsx
✅ HandlePage.tsx
✅ Header.tsx
✅ HomeAnalytics.tsx
✅ JoinSessionForm.tsx
✅ LandingPage.tsx
✅ MarketingPage.tsx
✅ MessageBubble.tsx
✅ MessageComposer.tsx
✅ MessageList.tsx
✅ PinPad.tsx
✅ SessionTimer.tsx
✅ SettingsControl.tsx ← UNIQUE
```

### Mobile Components (8 files)

```
✅ BrandMark.tsx
✅ ClaimHandleCard.tsx
✅ ConversationList.tsx
✅ MessageBubble.tsx
✅ MessageComposer.tsx
✅ MessageList.tsx
✅ PinPad.tsx
✅ ShareButton.tsx ← UNIQUE

❌ SettingsControl.tsx - MISSING!
```

---

## Service Layer Comparison

### Web Services

```
✅ device-settings.ts (save/load scramble preference)
✅ vault.ts (PIN vault)
✅ Other services...
```

### Mobile Services

```
✅ vault.ts (PIN vault)
✅ chat-hub.ts (multi-chat manager)
❌ device-settings.ts - MISSING!
```

---

## Hooks Comparison

### Web Hooks

```
✅ use-chat-session.ts
✅ use-device-settings.ts ← Settings hook
✅ use-app-viewport.ts
```

### Mobile Hooks

```
✅ use-relay-client.ts
❌ use-device-settings.ts - MISSING!
```

---

## Routes Comparison

### Web Routes (`apps/web/src/app/`)

```
/                    Landing page
/chat/[sessionId]    Chat session
/chats               Conversations list
/[handle]            User handle page
/about               About page
/guide               User guide
```

### Mobile Routes (`apps/mobile/app/`)

```
/                    Home (index.tsx)
/chat/[sessionId]    Chat session
/chats               Conversations list
/[handle]            User handle page
/join                Join session form
❌ /about           - MISSING
❌ /guide           - MISSING
```

---

## Implementation Roadmap

### Phase 1: Settings UI (Critical) 🔴

**Goal:** Achieve settings parity with web

**Tasks:**

1. **Create `apps/mobile/services/device-settings.ts`**
   ```typescript
   // Persist device settings to AsyncStorage
   interface DeviceSettings {
     scrambleMessages: boolean;
   }
   
   - loadDeviceSettings()
   - saveDeviceSettings()
   - useDeviceSettings() hook
   ```

2. **Create `apps/mobile/components/SettingsControl.tsx`**
   ```typescript
   // React Native settings modal
   - Settings button in header
   - PIN management
   - Scramble messages toggle
   - Modal UI (React Native)
   ```

3. **Update `apps/mobile/app/_layout.tsx`**
   ```typescript
   // Add settings button to navigation
   ```

4. **Update `apps/mobile/store/session.ts`**
   ```typescript
   // Add device settings state if needed
   ```

**Estimated Effort:** 4-6 hours

---

### Phase 2: About/Guide Pages 🟡

**Goal:** Add informational pages

**Tasks:**

1. **Create `apps/mobile/app/about.tsx`**
   - Project information
   - Links to docs
   - License info

2. **Create `apps/mobile/app/guide.tsx`**
   - User guide content
   - Feature explanations
   - FAQs

**Estimated Effort:** 2-3 hours

---

### Phase 3: UI Polish 🟢

**Goal:** Consistency and refinement

**Tasks:**

1. Review handle claiming UX
2. Add animations where missing
3. Ensure icon consistency
4. Accessibility audit

**Estimated Effort:** 2-4 hours

---

## Configuration Differences

### Recently Added: `@goprivate/config`

Several PRs reference a `@goprivate/config` package that wasn't in the original audit:

```typescript
// Imported in both web and mobile
import { concurrentChatLimitHint, pinLengthLabel } from '@goprivate/config';
```

**Status:** ✅ Appears to be shared properly

---

## Testing Gaps

### Web Tests
```
Settings component: ❓ No tests found
Device settings service: ❓ No tests found
```

### Mobile Tests
```
N/A - components don't exist yet
```

**Recommendation:** Add tests when implementing mobile settings

---

## Critical Issues Summary

### 🔴 Blocking Issues

1. **No Settings UI on Mobile**
   - **Impact:** Users cannot change PIN after initial setup
   - **Impact:** No control over message scrambling
   - **Users Affected:** All mobile users
   - **Priority:** CRITICAL

### 🟡 Important Issues

2. **Missing About/Guide Pages**
   - **Impact:** Less context for new users
   - **Priority:** HIGH

3. **Handle UX Polish**
   - **Impact:** Functional but could be better
   - **Priority:** MEDIUM

---

## Recommendations

### Immediate Actions (This Week)

1. **Implement Mobile Settings UI**
   - Create device-settings service
   - Build SettingsControl component
   - Add settings button to navigation
   - Test PIN change flow
   - Test scramble toggle

### Short Term (This Month)

2. **Add About/Guide Pages**
   - Port web content to mobile
   - Adapt layout for mobile
   - Link from home screen

3. **Testing**
   - Add unit tests for settings service
   - Add E2E tests for PIN change
   - Visual regression tests

### Long Term (3 Months)

4. **Feature Parity Review**
   - Quarterly audit of web vs mobile
   - Ensure new features land on both platforms
   - Document any intentional differences

---

## Dependencies Analysis

### Shared Dependencies (Both Platforms)

```typescript
@goprivate/config     - Shared config (NEW)
@goprivate/protocol   - Protocol types
@goprivate/crypto     - Encryption
@goprivate/sdk        - Relay client
```

### Platform-Specific

**Web:**
```typescript
react-dom              - React web
next                   - Framework
lucide-react          - Icons (Settings icon)
```

**Mobile:**
```typescript
react-native           - Mobile framework
expo                   - Build/deploy
expo-secure-store      - PIN storage
react-native-quick-crypto - Crypto
```

---

## Design System Comparison

### Web
- Glass morphism UI
- Tailwind CSS
- Custom UI components
- Settings icon from lucide-react

### Mobile
- StyleSheet-based
- Colors constants
- Native components
- No settings icon yet

**Gap:** Mobile needs settings icon (can use React Native vector icons or similar)

---

## Conclusion

The mobile app is **missing critical settings functionality** that exists on web. The recent multi-chat features were properly ported to mobile, but **settings UI was left behind**.

### Priority Matrix

```
High Impact, High Effort:    [None]
High Impact, Low Effort:     • Settings UI on mobile
Medium Impact, Low Effort:   • About/Guide pages
Low Impact, Low Effort:      • UI polish
```

### Next Steps

1. ✅ **Implement mobile settings** (4-6 hours)
2. Add about/guide pages (2-3 hours)
3. Establish feature parity process
4. Document intentional differences

---

**Audit completed:** September 29, 2026
