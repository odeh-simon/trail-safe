# Trail Safe — Phase 3 Fix Plan
*AI Agent Implementation Guide*

> Read this entire document before writing a single line of code.
> Complete fixes in order. After every fix, run `npm run build` to confirm no errors before moving on.

---

## Table of Contents

1. Critical Bugs to Fix
2. Fix 1 — Hike Termination (Role Wipe)
3. Fix 2 — Real-Time Role Watching in AuthProvider
4. Fix 3 — HikerHome Ended State
5. Fix 4 — LeaderHome Ended State + Remove Self-Service Join
6. Fix 5 — Disable Incident Subscriptions for Ended Hikes
7. Fix 6 — Join Links Stricter Ended Check
8. Fix 7 — Register Page Block for Ended Hikes
9. Fix 8 — checkInHiker Guard
10. Fix 9 — Alert Sound (Not Working)
11. Fix 10 — Responsive UI for Desktop
12. Agent Standing Rules

---

## 1. Critical Bugs to Fix

| # | Bug | Severity |
|---|-----|----------|
| BUG-A | Ended hike does not log out hikers or leaders | CRITICAL |
| BUG-B | Hiker shown "register" screen after hike ends | HIGH |
| BUG-C | Leader stays active and receives SOS alerts after hike ends | CRITICAL |
| BUG-D | Invite links still work for ended hikes | HIGH |
| BUG-E | Hiker can re-register for an ended hike | HIGH |
| BUG-F | Check-in still possible after hike ends | MEDIUM |
| BUG-G | SOS alert sound not working | HIGH |
| BUG-H | UI is mobile-only, looks broken on desktop | MEDIUM |

---

## 2. Fix 1 — `src/lib/firestore.js` — `endHike` Role Wipe

**Problem (BUG-A):** When the organizer ends a hike, `hike.status` is set to `"ended"` but every hiker and leader's `users/{uid}.role` remains set. So they stay on their role pages indefinitely.

**Solution:** When ending a hike, batch-reset `role` to `null` for every user who participated in that hike. When `AuthProvider` sees `role: null`, `RoleGuard` redirects them to `/`.

**Replace the existing `endHike` function entirely:**

```js
export async function endHike(hikeId) {
  try {
    // 1. Mark hike as ended
    await updateDoc(doc(db, 'hikes', hikeId), { status: 'ended' });

    // 2. Reset role for all hikers in this hike
    const hikersSnap = await getDocs(
      query(collection(db, 'hikers'), where('hikeId', '==', hikeId))
    );
    for (const h of hikersSnap.docs) {
      const userId = h.data().userId;
      if (userId) {
        await setDoc(doc(db, 'users', userId), { role: null }, { merge: true });
      }
    }

    // 3. Reset role for all leaders in this hike
    const leadersSnap = await getDocs(
      query(collection(db, 'leaders'), where('hikeId', '==', hikeId))
    );
    for (const l of leadersSnap.docs) {
      const userId = l.data().userId;
      if (userId) {
        await setDoc(doc(db, 'users', userId), { role: null }, { merge: true });
      }
    }
  } catch (err) {
    console.error('endHike:', err);
  }
}
```

**Note:** The organizer's own role is NOT reset — they stay on `/organizer` to see the final state of the ended hike.

**Also add `setDoc` to the imports at the top of `firestore.js` if not already present:**
```js
import { ..., setDoc, ... } from 'firebase/firestore';
```

---

## 3. Fix 2 — `src/components/layout/AuthProvider.jsx` — Real-Time Role Watch

**Problem (BUG-A, BUG-C):** `AuthProvider` calls `getUserRole` once using `getDoc` (one-time fetch). When `endHike` writes `role: null` to Firestore, the connected leader/hiker devices don't know — they only find out on next page refresh.

**Solution:** Replace the `getUserRole` one-time fetch with an `onSnapshot` listener on the user doc. This makes every connected device react immediately when the role changes.

**Rewrite `AuthProvider` completely:**

```jsx
import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ensureAuth } from '@/lib/firestore';
import { useAuthStore } from '@/store/useAuthStore';

export default function AuthProvider({ children }) {
  const { setUser, setRole, setLoading } = useAuthStore();

  // Unlock Web Audio API on first user interaction (needed for SOS alert sound)
  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          ctx.resume?.();
        }
      } catch (_) {}
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubRole = null;

    async function init() {
      try {
        const u = await ensureAuth();
        if (cancelled) return;
        setUser(u);

        // Subscribe to the user doc in real-time
        // When endHike writes role: null, this fires immediately on all devices
        unsubRole = onSnapshot(
          doc(db, 'users', u.uid),
          (snap) => {
            if (cancelled) return;
            const role = snap.exists() ? (snap.data().role ?? null) : null;
            setRole(role);
            setLoading(false);
          },
          (err) => {
            console.error('AuthProvider role watch error:', err);
            if (!cancelled) {
              setRole(null);
              setLoading(false);
            }
          }
        );
      } catch (err) {
        console.error('AuthProvider init error:', err);
        if (!cancelled) {
          setRole(null);
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      unsubRole?.();
    };
  }, [setUser, setRole, setLoading]);

  return children;
}
```

**Why this works:** Every device has an open Firestore listener on `users/{uid}`. The moment `endHike` writes `{ role: null }` to each user doc, all connected devices fire the snapshot callback, `setRole(null)` is called, Zustand updates, `RoleGuard` re-evaluates, and everyone is redirected to `/` within ~1 second.

---

## 4. Fix 3 — `src/pages/HikerHome.jsx` — Ended Hike Screen

**Problem (BUG-B):** When `useActiveHike()` returns `null` (no active/upcoming hike), the hiker sees "No active hike. Register for an upcoming hike first" with a Register button. A hiker who was on an ended hike should see "Hike Ended", not be invited to register again.

**Replace the `!hike` fallback:**

```jsx
// Remove this:
if (!hike) {
  return (
    <div ...>
      <p>No active hike. Register for an upcoming hike first.</p>
      <Button asChild><Link to="/register">Register</Link></Button>
    </div>
  );
}

// Replace with:
if (!hikeLoading && !hikerLoading && !hike) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] p-6 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center mb-4 mx-auto">
        <span className="text-3xl">🏔️</span>
      </div>
      <h2 className="text-xl font-bold text-[var(--color-dark)] mb-2">
        Hike Concluded
      </h2>
      <p className="text-[var(--color-mid)]">
        This hike has ended. Thank you for hiking safely!
      </p>
    </div>
  );
}
```

**Also remove** the `!hiker` fallback that shows a Register button — a hiker with a valid role who has no profile should see "Hike Ended" not "register first", because the only way they reach `/hiker` without a profile is via a stale session.

---

## 5. Fix 4 — `src/pages/LeaderHome.jsx` — Ended Hike + Remove Self-Service Join

**Problem (BUG-C):** Leader stays on the dashboard and keeps receiving incident alerts after hike ends. Also: the fallback when `!leader` still shows a self-service "Join as Leader" button that bypasses the invite link flow.

**Add ended hike guard after the `!hike` check:**

```jsx
// Add this block immediately after the !hike check
if (hike?.status === 'ended') {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] p-6 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center mb-4 mx-auto">
        <span className="text-3xl">🏔️</span>
      </div>
      <h2 className="text-xl font-bold text-[var(--color-dark)] mb-2">
        Hike Concluded
      </h2>
      <p className="text-[var(--color-mid)]">
        This hike has ended. All incidents are now closed.
      </p>
    </div>
  );
}
```

**Replace the self-service join fallback (`!leader` block) with:**

```jsx
if (!leader) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] p-6 text-center max-w-md mx-auto">
      <h2 className="text-xl font-bold text-[var(--color-dark)] mb-2">
        Not Joined
      </h2>
      <p className="text-[var(--color-mid)] mb-6">
        Open your leader invite link from the organizer to join this hike.
      </p>
      <Button variant="outline" onClick={() => navigate('/')}>
        Back to Home
      </Button>
    </div>
  );
}
```

**Remove** the `handleJoin` function and `joinAsLeader` import from `LeaderHome` entirely — it's no longer used.

---

## 6. Fix 5 — Disable Incident Subscriptions for Ended Hikes

**Problem (BUG-C):** Even when the leader is shown the ended screen, the `useIncident` hook is still subscribed and will fire the SOS sound alert if any incident is created.

**In `src/pages/LeaderHome.jsx`**, pass `null` as `hikeId` when hike is ended:

```js
const { myIncidents, otherIncidents } = useIncident(
  hike?.status === 'ended' ? null : hike?.id,
  leader?.userId ?? null
);
```

**In `src/pages/OrganizerDashboard.jsx`**, same pattern:

```js
const { myIncidents: allIncidents } = useIncident(
  currentHike?.status === 'ended' ? null : currentHike?.id
);
const { myIncidents: fullIncidentLog } = useIncident(
  currentHike?.status === 'ended' ? null : currentHike?.id,
  null,
  { includeResolved: true }
);
```

This passes `null` as `hikeId` to `useIncident`, which causes the hook to short-circuit and return empty arrays without subscribing to Firestore at all.

---

## 7. Fix 6 — `src/pages/JoinAsLeader.jsx` and `JoinAsHiker.jsx` — Stricter Ended Check

**Problem (BUG-D):** Invite links for ended hikes should be completely invalid.

**In `JoinAsLeader.jsx`**, verify the `hikeEnded` check covers all cases:

```js
// This should already exist but confirm it reads:
const hikeEnded = !hikeLoading && hike && (hike.status === 'ended');
const invalidHike = !hikeLoading && (hikeError || !hike || hikeEnded);
```

**In `JoinAsHiker.jsx`**, same:

```js
const hikeEnded = hike && hike.status === 'ended';
const invalidHike = !hikeLoading && (hikeError || !hike || hikeEnded);

if (invalidHike) {
  sessionStorage.removeItem(INVITE_HIKE_KEY); // Always clean up
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-6">
      <Card className="max-w-sm w-full">
        <CardContent className="pt-6 text-center">
          <p className="text-[var(--color-danger)] font-medium mb-2">
            This invite link is no longer valid.
          </p>
          <p className="text-sm text-[var(--color-mid)]">
            The hike may have ended or the link may be incorrect.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 8. Fix 7 — `src/pages/Register.jsx` — Block Registration for Ended Hike

**Problem (BUG-E):** A hiker can still submit the registration form even when the hike has ended.

**Add this check after `hike` resolves, before rendering the form:**

```jsx
if (!hikeLoading && hike?.status === 'ended') {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-6">
      <Card className="max-w-sm w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <p className="font-medium text-[var(--color-dark)]">
            Registration Closed
          </p>
          <p className="text-sm text-[var(--color-mid)]">
            This hike has ended. Registration is no longer available.
          </p>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 9. Fix 8 — `src/lib/firestore.js` — `checkInHiker` Guard

**Problem (BUG-F):** A hiker could technically trigger check-in after the hike ends if they have a stale UI state.

**Modify `checkInHiker` to verify hike status:**

```js
export async function checkInHiker(hikerId, location) {
  try {
    // Verify the hike is still active before allowing check-in
    const hikerSnap = await getDoc(doc(db, 'hikers', hikerId));
    const hikeId = hikerSnap.data()?.hikeId;
    if (hikeId) {
      const hikeSnap = await getDoc(doc(db, 'hikes', hikeId));
      if (hikeSnap.data()?.status !== 'active') {
        console.warn('checkInHiker: hike is not active, blocking check-in');
        return;
      }
    }
    await updateDoc(doc(db, 'hikers', hikerId), {
      checkedIn: true,
      checkedInAt: serverTimestamp(),
      lastLocation: { ...location, timestamp: new Date() },
    });
  } catch (err) {
    console.error('checkInHiker:', err);
  }
}
```

---

## 10. Fix 9 — `src/lib/alertSound.js` — Fix SOS Alert Sound

**Problem (BUG-G):** The Web Audio API requires the `AudioContext` to be in a "running" state before it can play sound. On most mobile browsers and many desktop browsers, `AudioContext` starts in a "suspended" state until a user gesture occurs. The current implementation creates a new `AudioContext` each time `playSOSAlert` is called, which means it's always suspended on the first call and produces no sound.

**The fix has two parts:**

### Part A — Rewrite `src/lib/alertSound.js`

Use a **shared, persistent `AudioContext`** that is created once and resumed on user gesture (handled by `AuthProvider`). This is the correct pattern.

```js
// Shared audio context — created once, reused for all alerts
let _audioCtx = null;

function getAudioContext() {
  if (!_audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    _audioCtx = new AudioContext();
  }
  return _audioCtx;
}

/**
 * Call this from a user gesture to unlock the audio context.
 * Called by AuthProvider on first click/touch.
 */
export function unlockAudioContext() {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  } catch (err) {
    console.warn('unlockAudioContext failed:', err);
  }
}

/**
 * Plays a three-beep SOS alert sound.
 * Works offline — uses Web Audio API synthesis, no files needed.
 * Requires prior call to unlockAudioContext() from a user gesture.
 */
export function playSOSAlert() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // If still suspended, try to resume (may not work without user gesture)
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => _playBeeps(ctx));
      return;
    }

    _playBeeps(ctx);
  } catch (err) {
    console.warn('playSOSAlert failed:', err);
  }
}

function _playBeeps(ctx) {
  const beep = (startTime, freq, duration) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.6, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  };

  const now = ctx.currentTime;
  beep(now,        880,  0.15);
  beep(now + 0.2,  880,  0.15);
  beep(now + 0.4,  1100, 0.35);
}
```

### Part B — Update `src/components/layout/AuthProvider.jsx`

Import `unlockAudioContext` from `alertSound` and call it from both the click and touchstart handlers:

```js
import { unlockAudioContext } from '@/lib/alertSound';

// In the audio unlock effect:
useEffect(() => {
  const unlockAudio = () => {
    unlockAudioContext(); // Use the shared context unlock
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
  };
  document.addEventListener('click', unlockAudio);
  document.addEventListener('touchstart', unlockAudio);
  return () => {
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
  };
}, []);
```

### Why the old version didn't work

The old `playSOSAlert` created `new AudioContext()` every call. New `AudioContext` instances start suspended on modern browsers. The `ctx.resume()` call is async and the beep was scheduled before `resume()` completed. By using a single shared context that gets unlocked on first user interaction, the context is always in a running state when alerts fire.

---

## 11. Fix 10 — Responsive UI for Desktop

**Problem (BUG-H):** Every page uses `max-w-[430px] mx-auto` which looks fine on mobile but creates a narrow single column on desktop. The app needs a responsive layout that adapts to wider screens.

### 11.1 — Layout Strategy

**Mobile (< 768px):** Current single-column layout, unchanged.
**Tablet (768px–1024px):** Slightly wider container, some two-column grids.
**Desktop (> 1024px):** Two-panel layout for dashboards. Left panel = navigation/summary, right panel = main content.

### 11.2 — Create `src/components/layout/AppShell.jsx`

This replaces the `max-w-[430px] mx-auto` pattern on all pages:

```jsx
/**
 * Responsive page shell.
 * Mobile: full width single column
 * Desktop: centered with max-width, optional sidebar
 */
export default function AppShell({ children, sidebar = null }) {
  if (sidebar) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex gap-6">
            {/* Sidebar: hidden on mobile, shown on md+ */}
            <aside className="hidden md:block w-64 flex-shrink-0">
              {sidebar}
            </aside>
            {/* Main content */}
            <main className="flex-1 min-w-0">
              {children}
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {children}
      </div>
    </div>
  );
}
```

### 11.3 — Update `src/pages/OrganizerDashboard.jsx`

The organizer dashboard should use a two-panel layout on desktop:

- **Left sidebar:** Hike selector, stats, invite links, Start/End Hike button
- **Right main:** Tabs (Hikers / Leaders / Incidents / Overview)

Wrap the dashboard content:

```jsx
// Replace: className="min-h-screen bg-[var(--color-bg)] p-4 pb-24 max-w-[430px] mx-auto"
// With a responsive container:

return (
  <div className="min-h-screen bg-[var(--color-bg)]">
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold text-[var(--color-dark)] mb-4">
        Organizer Dashboard
      </h1>
      
      {/* On desktop: two columns. On mobile: single column */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left column: hike info, stats, invite links, controls */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
          {/* Hike card */}
          {/* Stats bar — 2x2 grid on mobile, stacked on sidebar */}
          {/* Invite links card */}
          {/* Start/End hike buttons */}
          {/* Create new hike button */}
        </div>
        
        {/* Right column: tabs */}
        <div className="flex-1 min-w-0">
          {/* Tabs: Overview / Hikers / Leaders / Incidents */}
        </div>
        
      </div>
    </div>
  </div>
);
```

The stats grid should also adapt:
```jsx
// Mobile: 4 cols (small text)
// Desktop: can use larger cards in the sidebar
<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
```

### 11.4 — Update `src/pages/LeaderHome.jsx`

Leader home on desktop should show incidents and hikers side by side instead of tabbed:

```jsx
return (
  <div className="min-h-screen bg-[var(--color-bg)]">
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24">
      
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-dark)]">{hike.name}</h1>
          <p className="text-[var(--color-mid)]">
            {leader.name}
            {leader.roleTitle && <Badge variant="outline" className="ml-2">{leader.roleTitle}</Badge>}
          </p>
        </div>
        {/* Stats */}
        <div className="hidden sm:flex gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--color-success)]">{checkedIn}</p>
            <p className="text-xs text-[var(--color-mid)]">Checked In</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--color-danger)]">{allIncidents.length}</p>
            <p className="text-xs text-[var(--color-mid)]">Incidents</p>
          </div>
        </div>
      </div>
      
      {/* On desktop: side by side. On mobile: tabs (existing) */}
      <div className="hidden md:grid md:grid-cols-2 gap-6">
        {/* Incidents panel */}
        <div>
          <h2 className="font-semibold text-[var(--color-dark)] mb-3">Active Incidents</h2>
          {/* incident cards */}
        </div>
        {/* Hikers panel */}
        <div>
          <h2 className="font-semibold text-[var(--color-dark)] mb-3">Checked-In Hikers</h2>
          {/* hiker list */}
        </div>
      </div>
      
      {/* Mobile: existing tab layout — keep as-is, just hide on md+ */}
      <div className="md:hidden">
        {/* Existing Tabs component */}
      </div>
      
    </div>
  </div>
);
```

### 11.5 — Update `src/pages/HikerHome.jsx`

Hiker home is more content-light. On desktop just widen it and use a two-column card layout:

```jsx
// Replace: max-w-[430px] mx-auto
// With:
<div className="min-h-screen bg-[var(--color-bg)]">
  <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
    
    {/* On desktop: hike info + check-in side by side */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
      {/* Hike card */}
      {/* Check in/out card */}
    </div>
    
    {/* SOS button full width */}
    
  </div>
</div>
```

### 11.6 — Update `src/pages/Landing.jsx`

Landing should be full-screen and visually impressive on desktop:

```jsx
// Replace the narrow column with a centered hero layout
<div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)]">
  
  {/* Left panel: branding (full width on mobile, half on desktop) */}
  <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center lg:text-left lg:items-start">
    <h1 className="text-5xl lg:text-7xl font-bold text-white mb-4">Trail Safe</h1>
    <p className="text-white/80 text-xl lg:text-2xl mb-2">Hike together. Stay safe.</p>
    <p className="text-white/60 text-base max-w-md">
      Real-time safety management for hiking groups. GPS check-in, SOS alerts, 
      and compass-guided emergency response.
    </p>
  </div>
  
  {/* Right panel: action (full width on mobile, half on desktop) */}
  <div className="flex flex-col items-center justify-center px-8 py-12 lg:w-96 bg-white/10 backdrop-blur-sm">
    <div className="w-full max-w-sm space-y-4">
      <Button
        onClick={() => setPinOpen(true)}
        className="w-full h-14 text-lg bg-white text-[var(--color-primary-dark)] hover:bg-white/90"
      >
        Organizer Access
      </Button>
      <p className="text-white/60 text-sm text-center">
        Joining a hike? Use the link your organizer shared with you.
      </p>
    </div>
  </div>

</div>
```

### 11.7 — Update `src/pages/Register.jsx`

```jsx
// Replace: max-w-[430px] mx-auto
// With: max-w-2xl mx-auto

// On desktop, show the two form cards (Your Details + Emergency Contact) side by side:
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <Card>{/* Your Details */}</Card>
  <Card>{/* Emergency Contact */}</Card>
</div>
```

### 11.8 — Update `src/pages/Compass.jsx`

Compass page on desktop should center the compass in a wider layout:

```jsx
// Replace: min-h-screen bg-[#0F172A] p-4 flex flex-col
// With:
<div className="min-h-screen bg-[#0F172A] text-white">
  <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col min-h-screen">
    {/* compass content */}
  </div>
</div>
```

### 11.9 — Update `src/components/layout/BottomNav.jsx`

Bottom nav should only show on mobile. On desktop, show a top nav bar instead:

```jsx
export default function BottomNav({ role, incidentCount = 0 }) {
  const loc = useLocation().pathname;

  const hikerLinks = [
    { to: '/hiker', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { to: '/emergency-card', label: 'Emergency Card', icon: <Heart className="w-5 h-5" /> },
  ];
  
  const leaderLinks = [
    { to: '/leader', label: 'Dashboard', icon: <Shield className="w-5 h-5" /> },
  ];

  const links = role === 'hiker' ? hikerLinks : role === 'leader' ? leaderLinks : [];

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex z-40">
        {links.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-4 flex-1 text-xs font-medium transition-colors
              ${loc === link.to ? 'text-[var(--color-primary)]' : 'text-[var(--color-mid)]'}`}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Desktop top nav */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] z-40 px-6 py-3 items-center gap-6">
        <span className="font-bold text-[var(--color-primary)] text-lg mr-4">Trail Safe</span>
        {links.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex items-center gap-2 text-sm font-medium transition-colors
              ${loc === link.to ? 'text-[var(--color-primary)]' : 'text-[var(--color-mid)] hover:text-[var(--color-dark)]'}`}
          >
            {link.icon}
            {link.label}
            {link.label === 'Dashboard' && incidentCount > 0 && (
              <span className="bg-[var(--color-danger)] text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                {incidentCount}
              </span>
            )}
          </Link>
        ))}
      </header>
    </>
  );
}
```

When using the top nav on desktop, pages need `pt-16` to avoid content hiding behind the fixed header. Add `md:pt-16` to the outer container of `HikerHome` and `LeaderHome`.

### 11.10 — Table Responsiveness

The `ManifestTable` and `LeaderTable` components use horizontal scroll on mobile (`overflow-x-auto`). On desktop they should display all columns comfortably. No change needed — `overflow-x-auto` works fine, tables just naturally expand on wider screens.

### 11.11 — `src/pages/IncidentView.jsx`

```jsx
// Replace: max-w-[430px] mx-auto
// With: max-w-2xl mx-auto

// On desktop, show medical info + location side by side:
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
  <Card>{/* Medical Info */}</Card>
  <Card>{/* Location + Leader Info */}</Card>
</div>
```

---

## 12. Agent Standing Rules

```
ALWAYS:
- Run `npm run build` after each fix before moving to the next
- Use @/ alias for all imports
- Use CSS token variables — never hardcode hex values (exception: Compass dark background #0F172A is acceptable)
- Keep all mobile layouts working — never break existing mobile behavior when adding desktop styles
- Use Tailwind responsive prefixes: sm:, md:, lg: for breakpoints
- Test that the mobile layout still works after every responsive change

NEVER:
- Remove offline persistence or offline handling
- Remove existing mobile-specific styles without replacing them
- Hardcode the organizer PIN
- Use localStorage for critical data (sessionStorage for invite hikeId is acceptable)
- Add new dependencies without checking if an existing one covers the need

RESPONSIVE BREAKPOINTS:
- Mobile: default (no prefix) — < 640px
- Tablet: sm: — 640px+
- Laptop: md: — 768px+
- Desktop: lg: — 1024px+

PHASE COMPLETION CHECK:
Before calling this task done, verify:
□ npm run build passes with no errors
□ Organizer ends hike → hikers and leaders are redirected to / within 2 seconds
□ Invite links for ended hike show "no longer valid"
□ Register page shows "Registration Closed" for ended hike
□ SOS sound plays when a new incident is created (test on a real device)
□ Dashboard looks good at 1440px wide (not a narrow column)
□ Hiker/leader home looks good at 1440px wide
□ Landing page looks good at 1440px wide
□ Mobile layout at 375px still works correctly for all pages
□ No console errors on any page
```

---

*Trail Safe Phase 3 — Hike Termination + Sound Fix + Responsive UI | Agent Implementation Guide*
