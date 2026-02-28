# Trail Safe — Full Refactoring & Improvement Plan
*AI Agent Implementation Guide — Phase 2*

> Read every section before writing a single line of code. All items are ordered by dependency — complete phases in sequence.

---

## Table of Contents

1. Bugs Found in Codebase Audit
2. New Features & Improvements Overview
3. Phase 1 — Shareable Link Auth Flow
4. Phase 2 — Route Guards & Role Protection
5. Phase 3 — Bug Fixes
6. Phase 4 — Leader Onboarding & Assignment
7. Phase 5 — Organizer Dashboard Overhaul
8. Phase 6 — Leader Dashboard Overhaul
9. Phase 7 — Hiker Screen Improvements
10. Phase 8 — Sound Alerts
11. Phase 9 — UI & UX Polish (All Roles)
12. Phase 10 — Dead Code & Structure Cleanup
13. New File Map
14. Firestore Schema Changes
15. Agent Standing Rules

---

## 1. Bugs Found in Codebase Audit

These must all be fixed. Each is addressed in the relevant phase below.

### BUG-01 — Same Firebase user shared across browser tabs (CRITICAL)
**File:** `src/components/layout/AuthProvider.jsx`
**Problem:** `signInAnonymously` returns the same anonymous user for every tab in the same browser session. Two tabs = same UID = same Firestore documents. Role buttons overwrite each other.
**Fix:** Shareable link flow (Phase 1) eliminates the need for role selection entirely.

### BUG-02 — No route protection (CRITICAL)
**File:** `src/router.jsx`
**Problem:** Any user can visit `/organizer`, `/leader`, or `/hiker` directly without any role check. Zero access control.
**Fix:** Phase 2 — add `RoleGuard` component wrapping protected routes.

### BUG-03 — Stale closure in Compass location interval (HIGH)
**File:** `src/pages/Compass.jsx`
**Problem:** The `setInterval` inside `useEffect` captures the initial `lat`/`lng` values. When GPS updates, a new effect fires and a new interval starts — but the old one may not have been cleared yet. Multiple intervals stack up, causing redundant writes and stale location data being sent.
**Fix:** Phase 3 — use a `ref` to track latest coords and a single stable interval.

### BUG-04 — `useOrganizerHikes` not real-time (HIGH)
**File:** `src/hooks/useOrganizerHikes.js`
**Problem:** Uses `getDocs` (one-time fetch) instead of `onSnapshot`. The organizer dashboard stats (registered/checked-in counts) are stale until manual `refetch()` is called.
**Fix:** Phase 3 — rewrite hook to use `onSnapshot`.

### BUG-05 — Hiker check-out UI bug (MEDIUM)
**File:** `src/pages/HikerHome.jsx`
**Problem:** After checking out, the UI still reads "Checked in" and no re-check-in button is shown. The `hiker.checkedOut` state is never reflected in the UI branch. The in/out counts in the organizer dashboard also don't reflect correctly because checked-out hikers still appear as "checked in" (`checkedIn: true` and `checkedOut: true` both being true).
**Fix:** Phase 7 — fix UI branching and fix count logic.

### BUG-06 — Leader can join any hike with no verification (MEDIUM)
**File:** `src/pages/LeaderHome.jsx` + `src/lib/firestore.js`
**Problem:** `joinAsLeader()` creates a leader doc for any `hikeId` with no name, no role info, no organizer approval. Anyone who visits `/leader` can insert themselves.
**Fix:** Phase 4 — leaders join via invite link, provide name + role, organizer approves or auto-assigns.

### BUG-07 — `App.jsx`, `App.css`, `src/index.css` are dead Vite defaults (LOW)
**Problem:** These files are Vite template defaults. `App.jsx` is not imported anywhere in the actual app. `src/index.css` conflicts with `globals.css`. They cause confusion and linting noise.
**Fix:** Phase 10 — delete these files.

### BUG-08 — `IncidentView` page is an empty placeholder (LOW)
**File:** `src/pages/IncidentView.jsx`
**Problem:** Returns `<h1>Incident View</h1>`. Linked from organizer dashboard but shows nothing.
**Fix:** Phase 5 — implement full incident detail view.

### BUG-09 — `ManifestTable` overdue logic is wrong (MEDIUM)
**File:** `src/components/organizer/ManifestTable.jsx`
**Problem:** Overdue flag only triggers when `hike.status === "ended"`. But hikers should be flagged overdue 30 min after the expected hike end time regardless of whether the organizer has clicked "End Hike". Also, hikers who checked out are not excluded from the "In" count correctly — the component doesn't account for `checkedIn: true && checkedOut: true` both being set.
**Fix:** Phase 5 — fix overdue logic and count logic.

### BUG-10 — No feedback after SOS is sent (MEDIUM)
**File:** `src/pages/HikerHome.jsx`
**Problem:** After SOS fires, the hiker sees "Help is on the way" text but the SOS button is still visible and still pulsing. There's no assigned leader name shown, no distance shown, and the button can be pressed again to fire a duplicate incident.
**Fix:** Phase 7 — post-SOS state showing leader name and estimated distance.

### BUG-11 — Missing Firestore index causes silent query failure (MEDIUM)
**File:** `src/hooks/useIncident.js`
**Problem:** The incidents query filters by `hikeId` and orders by `firedAt` — this requires a composite index. If the index doesn't exist yet, `onSnapshot` will silently fail (error is caught and swallowed). Leaders will see no incidents even when they exist.
**Fix:** Phase 3 — add error logging + confirm index exists in `firestore.indexes.json`.

### BUG-12 — `HikeForm` creates leaders with `leaderId: null` for all groups (LOW)
**File:** `src/components/organizer/HikeForm.jsx`
**Problem:** `createLeadersForHike` is called with `leaderProfiles: []` and all groups have `leaderId: null`. So no leader docs are actually created at hike creation time. The function loops over groups, hits `if (!g.leaderId) continue;` and does nothing. This is misleading — the function appears to create leaders but doesn't.
**Fix:** Phase 4 — remove the dead `createLeadersForHike` call from `HikeForm`. Leaders are created when they join via invite link instead.

### BUG-13 — `useIncident` in `OrganizerDashboard` uses wrong filter (MEDIUM)
**File:** `src/pages/OrganizerDashboard.jsx`
**Problem:** `useIncident(currentHike?.id)` is called without a `leaderId`, which means `myIncidents` contains ALL incidents and `otherIncidents` is always empty. The variable name `myIncidents` in the organizer context is misleading — it's actually all incidents. Works by coincidence but is confusing and will break if logic changes.
**Fix:** Phase 5 — rename to `allIncidents` for organizer context, pass no leaderId.

---

## 2. New Features & Improvements Overview

| # | Feature | Affects | Phase |
|---|---------|---------|-------|
| F-01 | Shareable join links (leader + hiker) | Auth flow | 1 |
| F-02 | Organizer PIN protection | Landing | 1 |
| F-03 | Route guards per role | Router | 2 |
| F-04 | Leader name + role collection on join | Leader onboarding | 4 |
| F-05 | Organizer assigns leaders to groups | Organizer dashboard | 5 |
| F-06 | Auto-assign leaders to groups | System logic | 5 |
| F-07 | Full organizer hiker manifest table | Organizer dashboard | 5 |
| F-08 | Full organizer leader table | Organizer dashboard | 5 |
| F-09 | Incident detail view with progress | Organizer + Leader | 5 |
| F-10 | Leader sees all incidents + compass | Leader dashboard | 6 |
| F-11 | Leader sees assigned hiker emergency card | Leader dashboard | 6 |
| F-12 | Live distance countdown to hiker | Compass page | 6 |
| F-13 | Close incident from compass | Compass page | 6 |
| F-14 | Closed incident syncs to all roles | All | 6 |
| F-15 | SOS sound alert for all roles | Leader + Organizer | 8 |
| F-16 | Hiker re-check-in after premature checkout | Hiker home | 7 |
| F-17 | Post-SOS hiker status screen | Hiker home | 7 |
| F-18 | Correct in/out count logic | Organizer dashboard | 5 |
| F-19 | Real-time organizer dashboard | Organizer dashboard | 3 |
| F-20 | UI polish across all roles | All pages | 9 |

---

## 3. Phase 1 — Shareable Link Auth Flow

**Goal:** Replace the current role-selection landing page with a link-based system. The organizer is the only person who reaches the app directly. Leaders and hikers join via unique hike links.

### 1.1 — New Environment Variable

Add to `.env.local`:
```
VITE_ORGANIZER_PIN=1234
```
This is the PIN the organizer enters to access the dashboard. Change before real use. The agent must not hardcode this value — always read from `import.meta.env.VITE_ORGANIZER_PIN`.

### 1.2 — Rewrite `src/pages/Landing.jsx`

Remove the three role buttons. Replace with:

- App hero (logo, tagline)
- A single "Organizer Access" button that opens a PIN entry dialog (4-digit input)
- If PIN matches `VITE_ORGANIZER_PIN`, navigate to `/organizer`
- If PIN is wrong, show inline error "Incorrect PIN"
- A helper text below: *"Joining a hike? Use the link your organizer shared with you."*

```jsx
// Pseudocode — agent writes full implementation
const handleOrganizerAccess = async () => {
  if (pin === import.meta.env.VITE_ORGANIZER_PIN) {
    await setUserProfile(user.uid, { role: 'organizer' });
    setRole('organizer');
    navigate('/organizer');
  } else {
    setError('Incorrect PIN');
  }
};
```

### 1.3 — Create `src/pages/JoinAsLeader.jsx`

**Route:** `/join/leader/:hikeId`

This page is opened when a leader clicks the invite link the organizer shared.

**Flow:**
1. Page loads, reads `hikeId` from URL params
2. Fetches hike name from Firestore to display: *"You've been invited to join [Hike Name] as a Leader"*
3. Shows a form with:
   - Full Name (required)
   - Phone number (required)
   - Role/Title within team (required) — e.g. "First Aid", "Group Lead", "Sweep"
4. On submit:
   - Calls `setUserProfile(uid, { role: 'leader' })`
   - Calls `joinAsLeader(hikeId, uid, name, phone, roleTitle)`
   - Navigates to `/leader`
5. If leader already joined this hike (doc exists), skip form and go straight to `/leader`
6. If hike not found or ended, show error: *"This invite link is no longer valid."*

### 1.4 — Create `src/pages/JoinAsHiker.jsx`

**Route:** `/join/hiker/:hikeId`

This page is opened when a hiker clicks the invite link.

**Flow:**
1. Page loads, reads `hikeId` from URL params
2. Stores `hikeId` in sessionStorage: `sessionStorage.setItem('trailsafe_invite_hikeId', hikeId)`
3. Calls `setUserProfile(uid, { role: 'hiker' })`
4. If hiker already registered for this hike, go straight to `/hiker`
5. Otherwise navigate to `/register` — the register page reads `hikeId` from sessionStorage instead of querying for any active hike

### 1.5 — Update `src/pages/Register.jsx`

Change hike resolution logic:

```js
// Old: query Firestore for any active/upcoming hike
const { hike } = useActiveHike();

// New: prefer hikeId from sessionStorage (set by JoinAsHiker)
// Fall back to useActiveHike() only if no sessionStorage hikeId
const inviteHikeId = sessionStorage.getItem('trailsafe_invite_hikeId');
const { hike } = inviteHikeId ? useHike(inviteHikeId) : useActiveHike();
```

After successful registration, clear sessionStorage: `sessionStorage.removeItem('trailsafe_invite_hikeId')`

### 1.6 — Update `src/pages/OrganizerDashboard.jsx`

After a hike is created, display two shareable links with copy buttons:

```jsx
// Show this card after hike is created
<Card>
  <CardHeader><CardTitle>Share Invite Links</CardTitle></CardHeader>
  <CardContent className="space-y-3">
    <div>
      <p className="text-sm font-medium mb-1">Leader Invite Link</p>
      <div className="flex gap-2">
        <Input readOnly value={`${window.location.origin}/join/leader/${hikeId}`} />
        <Button onClick={() => copyToClipboard(leaderLink)}>Copy</Button>
      </div>
    </div>
    <div>
      <p className="text-sm font-medium mb-1">Hiker Invite Link</p>
      <div className="flex gap-2">
        <Input readOnly value={`${window.location.origin}/join/hiker/${hikeId}`} />
        <Button onClick={() => copyToClipboard(hikerLink)}>Copy</Button>
      </div>
    </div>
  </CardContent>
</Card>
```

### 1.7 — Update `src/router.jsx`

Add new routes:
```jsx
{ path: '/join/leader/:hikeId', element: <JoinAsLeader /> },
{ path: '/join/hiker/:hikeId',  element: <JoinAsHiker /> },
```

---

## 4. Phase 2 — Route Guards & Role Protection

### 2.1 — Create `src/components/layout/RoleGuard.jsx`

```jsx
/**
 * Protects a route by required role.
 * Redirects to / if user doesn't have the required role.
 * Shows loading spinner while auth is resolving.
 */
export default function RoleGuard({ requiredRole, children }) {
  const { role, loading } = useAuthStore();
  
  if (loading) return <LoadingScreen />;
  if (role !== requiredRole) return <Navigate to="/" replace />;
  return children;
}
```

### 2.2 — Update `src/router.jsx`

Wrap protected routes:

```jsx
{ path: '/organizer', element: <RoleGuard requiredRole="organizer"><OrganizerDashboard /></RoleGuard> },
{ path: '/leader',    element: <RoleGuard requiredRole="leader"><LeaderHome /></RoleGuard> },
{ path: '/hiker',     element: <RoleGuard requiredRole="hiker"><HikerHome /></RoleGuard> },
{ path: '/register',  element: <RoleGuard requiredRole="hiker"><Register /></RoleGuard> },
{ path: '/compass/:incidentId', element: <RoleGuard requiredRole="leader"><Compass /></RoleGuard> },
{ path: '/emergency-card',      element: <RoleGuard requiredRole="hiker"><EmergencyCard /></RoleGuard> },
```

### 2.3 — Create `src/components/layout/LoadingScreen.jsx`

Full-screen loading state used by `RoleGuard` and any other page needing it:

```jsx
export default function LoadingScreen({ message = "Loading..." }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)]">
      <div className="w-12 h-12 rounded-full border-4 border-[var(--color-primary)] border-t-transparent animate-spin mb-4" />
      <p className="text-[var(--color-mid)]">{message}</p>
    </div>
  );
}
```

---

## 5. Phase 3 — Bug Fixes

### 3.1 — Fix Compass stale interval (BUG-03)

**File:** `src/pages/Compass.jsx`

Replace the location update effect with a ref-based approach:

```js
const latestCoordsRef = useRef({ lat: null, lng: null });

// Keep ref updated whenever GPS changes
useEffect(() => {
  latestCoordsRef.current = { lat, lng };
}, [lat, lng]);

// Single stable interval that reads from ref
useEffect(() => {
  if (!leader?.id) return;
  const id = setInterval(() => {
    const { lat: currentLat, lng: currentLng } = latestCoordsRef.current;
    if (currentLat && currentLng) {
      updateLeaderLocation(leader.id, { lat: currentLat, lng: currentLng });
    }
  }, 5000);
  return () => clearInterval(id);
}, [leader?.id]); // Only re-create interval if leader changes, not on every GPS update
```

### 3.2 — Fix `useOrganizerHikes` to real-time (BUG-04)

**File:** `src/hooks/useOrganizerHikes.js`

Rewrite completely using `onSnapshot`:

```js
export function useOrganizerHikes(organizerId) {
  const [hikes, setHikes] = useState([]);
  const [currentHike, setCurrentHike] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!organizerId) { setLoading(false); return; }

    const q = query(
      collection(db, 'hikes'),
      where('organizerId', '==', organizerId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.date?.toMillis?.() ?? 0) - (a.date?.toMillis?.() ?? 0));
      setHikes(list);
      const active = list.find(h => h.status === 'active' || h.status === 'upcoming');
      setCurrentHike(prev => {
        // Don't reset manually selected hike unless it no longer exists
        if (prev && list.find(h => h.id === prev.id)) {
          return list.find(h => h.id === prev.id); // Update with latest data
        }
        return active || list[0] || null;
      });
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });

    return () => unsub();
  }, [organizerId]);

  // refetch is now a no-op since we have real-time, keep for API compatibility
  const refetch = useCallback(() => {}, []);

  return { hikes, currentHike, setCurrentHike, loading, error, refetch };
}
```

Remove `getDocs` import, add `onSnapshot` import.

### 3.3 — Fix incident query error logging (BUG-11)

**File:** `src/hooks/useIncident.js`

Change the `onSnapshot` error handler from silent set to console.error:

```js
(err) => {
  console.error('useIncident onSnapshot error:', err.code, err.message);
  // If missing index, err.code === 'failed-precondition'
  setError(err.message);
  setLoading(false);
}
```

### 3.4 — Fix `HikeForm` dead leader creation call (BUG-12)

**File:** `src/components/organizer/HikeForm.jsx`

Remove the `createLeadersForHike` call entirely from `handleSubmit`. Leaders are now created when they join via invite link. Remove the import too.

### 3.5 — Fix `OrganizerDashboard` incident variable naming (BUG-13)

**File:** `src/pages/OrganizerDashboard.jsx`

```js
// Old
const { myIncidents } = useIncident(currentHike?.id);
const activeIncidents = myIncidents?.length ?? 0;

// New
const { myIncidents: allIncidents } = useIncident(currentHike?.id);
const activeIncidentCount = allIncidents?.length ?? 0;
```

Update all references in the JSX accordingly.

---

## 6. Phase 4 — Leader Onboarding & Assignment

### 6.1 — Update `src/lib/firestore.js` — `joinAsLeader`

Add `roleTitle` parameter and `status` field:

```js
export async function joinAsLeader(hikeId, userId, name, phone = '', roleTitle = '') {
  try {
    // Check if already joined
    const q = query(
      collection(db, 'leaders'),
      where('userId', '==', userId),
      where('hikeId', '==', hikeId)
    );
    const existing = await getDocs(q);
    if (!existing.empty) return existing.docs[0].id;

    const ref = await addDoc(collection(db, 'leaders'), {
      userId,
      hikeId,
      groupId: null,
      name,
      phone,
      roleTitle,      // "First Aid", "Group Lead", "Sweep", etc.
      isActive: true,
      status: 'available', // 'available' | 'responding' | 'arrived'
      lastLocation: null,
      joinedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.error('joinAsLeader:', err);
    return null;
  }
}
```

### 6.2 — Add `assignLeaderToGroup` to `src/lib/firestore.js`

```js
/**
 * Assign a leader to a group. Organizer or system calls this.
 * @param {string} leaderId  - Firestore doc ID of the leader
 * @param {string|null} groupId
 */
export async function assignLeaderToGroup(leaderId, groupId) {
  try {
    await updateDoc(doc(db, 'leaders', leaderId), { groupId });
  } catch (err) {
    console.error('assignLeaderToGroup:', err);
  }
}
```

### 6.3 — Add `autoAssignLeaders` to `src/lib/firestore.js`

```js
/**
 * Auto-assign unassigned leaders to groups that have no leader.
 * Called when organizer clicks "Start Hike" or manually.
 * @param {string} hikeId
 * @param {Array<{ id: string }>} groups
 */
export async function autoAssignLeaders(hikeId, groups) {
  try {
    const q = query(collection(db, 'leaders'), where('hikeId', '==', hikeId));
    const snap = await getDocs(q);
    const leaders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const unassignedLeaders = leaders.filter(l => !l.groupId);
    const unledGroups = groups.filter(g => !leaders.find(l => l.groupId === g.id));

    for (let i = 0; i < Math.min(unassignedLeaders.length, unledGroups.length); i++) {
      await assignLeaderToGroup(unassignedLeaders[i].id, unledGroups[i].id);
    }
  } catch (err) {
    console.error('autoAssignLeaders:', err);
  }
}
```

### 6.4 — Add `useLeadersForHike` hook

**New file:** `src/hooks/useLeadersForHike.js`

```js
/**
 * Subscribe to all leaders for a hike
 * @param {string|null} hikeId
 * @returns {{ leaders: Array; loading: boolean; error: string|null }}
 */
export function useLeadersForHike(hikeId) {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hikeId) { setLeaders([]); setLoading(false); return; }

    const q = query(
      collection(db, 'leaders'),
      where('hikeId', '==', hikeId)
    );

    const unsub = onSnapshot(q, (snap) => {
      setLeaders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('useLeadersForHike:', err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsub();
  }, [hikeId]);

  return { leaders, loading, error };
}
```

---

## 7. Phase 5 — Organizer Dashboard Overhaul

The organizer dashboard must be restructured into tabs for clarity. Use shadcn `Tabs` component.

### 7.1 — Dashboard Tab Structure

```
OrganizerDashboard
  ├── Header: Hike name + status badge + Start/End Hike button
  ├── Stats bar: Registered | Checked In | Checked Out | Active Incidents
  ├── Invite Links card (always visible)
  └── Tabs:
        ├── Overview   — incidents + quick stats
        ├── Hikers     — full manifest table
        ├── Leaders    — leader list + group assignment
        └── Incidents  — full incident log
```

### 7.2 — Stats Bar Fix (BUG-05 + F-18)

The counts must correctly reflect:
- **Registered:** `hikers.length` (all hikers, regardless of status)
- **Checked In:** `hikers.filter(h => h.checkedIn && !h.checkedOut).length`
- **Checked Out:** `hikers.filter(h => h.checkedOut).length`
- **Active Incidents:** `allIncidents.filter(i => i.status !== 'resolved').length`

A hiker who checks out has both `checkedIn: true` AND `checkedOut: true`. The "In" count must exclude those with `checkedOut: true`.

### 7.3 — Rewrite `src/components/organizer/ManifestTable.jsx`

Full hiker table with:

| Column | Content |
|--------|---------|
| Name | `hiker.name` |
| Group | Group name from hike.groups lookup |
| Status | Badge: "In" (green) / "Out" (grey) / "Not In" (red) / "Overdue" (orange) |
| Check In Time | Formatted timestamp |
| Emergency Card | Link button → `/emergency-card` with hikerId param OR modal |
| Blood Type | `hiker.medicalInfo.bloodType` |

**Overdue logic fix (BUG-09):**
```js
const isOverdue = (hiker) => {
  if (!hiker.checkedIn || hiker.checkedOut) return false;
  const hikeEndTime = hike.date?.toMillis?.()
    ? hike.date.toMillis() + (hike.expectedDuration || 180) * 60 * 1000
    : null;
  if (!hikeEndTime) return false;
  return Date.now() > hikeEndTime + overdueThresholdMinutes * 60 * 1000;
};
```

### 7.4 — Create `src/components/organizer/LeaderTable.jsx`

New component for the Leaders tab. Displays:

| Column | Content |
|--------|---------|
| Name | `leader.name` |
| Role | `leader.roleTitle` |
| Group | Dropdown select to assign group |
| Status | Badge: "Available" / "Responding" / "Arrived" |
| Location | "GPS active" or "No location" |

Each row has an inline group assignment dropdown. On change, calls `assignLeaderToGroup(leader.id, newGroupId)`.

Below the table, show a button: **"Auto-Assign Unassigned Leaders"** which calls `autoAssignLeaders(hikeId, hike.groups)`.

### 7.5 — Rewrite `src/pages/IncidentView.jsx`

Full incident detail page for organizer and leader. Shows:
- Incident type + hiker name + timestamp
- Hiker medical info (blood type, conditions, medications, allergies)
- Emergency contact
- GPS coordinates + Google Maps link
- Assigned leader name + distance to hiker (live, if leader has GPS)
- Incident status timeline: "SOS fired → Leader responding → Arrived"
- For organizer: shows who is closest to incident using haversine against all active leaders
- Resolve button (for organizer only, as override)

Route: `/incident/:id` (already in router)

### 7.6 — Add `getIncidentById` to `src/lib/firestore.js`

```js
export function subscribeToIncident(incidentId, callback) {
  return onSnapshot(doc(db, 'incidents', incidentId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}
```

---

## 8. Phase 6 — Leader Dashboard Overhaul

### 8.1 — Rewrite `src/pages/LeaderHome.jsx`

Structure:

```
LeaderHome
  ├── Header: Hike name + leader name + role badge
  ├── Stats: Hikers checked in | Active incidents
  └── Tabs:
        ├── Incidents — all active/responding incidents
        └── Hikers    — checked-in hiker list
```

**Incidents tab must show:**
- All active incidents (not just assigned ones)
- For each incident:
  - Hiker name + type + note
  - GPS coordinates + Google Maps link
  - Who is assigned (leader name)
  - If assigned to THIS leader: highlight red, show "Respond" and "Open Compass" buttons
  - If assigned to another leader: show in warning yellow with that leader's name
  - Distance from each available leader to hiker (computed from haversine)
  - "Closest leader: [name] — [distance]m"

### 8.2 — Emergency Card Modal on Leader Compass Screen

When a leader opens the compass for an incident they're assigned to, show the hiker's full emergency card in a collapsible panel:

```jsx
// In Compass.jsx, below the compass rose
<Collapsible>
  <CollapsibleTrigger>
    <Button variant="outline">Show Hiker Emergency Info</Button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    <div className="bg-[#1E293B] rounded-lg p-4 space-y-2">
      <p><strong>Blood Type:</strong> {med.bloodType}</p>
      <p><strong>Conditions:</strong> {med.conditions || '—'}</p>
      <p><strong>Medications:</strong> {med.medications || '—'}</p>
      <p><strong>Allergies:</strong> {med.allergies || '—'}</p>
      <p><strong>Emergency Contact:</strong> {incident.hikerMedicalInfo?.emergencyContact?.name}</p>
      <p><strong>Contact Phone:</strong> {incident.hikerMedicalInfo?.emergencyContact?.phone}</p>
    </div>
  </CollapsibleContent>
</Collapsible>
```

Note: `emergencyContact` must be denormalized into the incident at SOS fire time. Update `fireSOSIncident` to include it.

### 8.3 — Update `fireSOSIncident` to include emergency contact

**File:** `src/lib/firestore.js`

```js
// In fireSOSIncident, fetch hiker doc to get emergencyContact
const hikerSnap = await getDoc(doc(db, 'hikers', hiker.id));
const hikerData = hikerSnap.data() || {};

const incident = {
  ...
  hikerMedicalInfo: {
    ...hiker.medicalInfo,
    emergencyContact: hikerData.emergencyContact || {},
  },
  ...
};
```

### 8.4 — Incident Closing Sync

When a leader clicks "Arrived — Close Incident":
1. `resolveIncident(incidentId)` sets `status: 'resolved'`
2. All listeners (`useIncident` on leader home, organizer dashboard, hiker home) receive the update via `onSnapshot`
3. The incident disappears from the active list on all screens
4. Hiker sees their SOS status change to "Resolved — Help has arrived"

This already works architecturally (onSnapshot propagates) — just needs the UI states connected properly.

### 8.5 — Live Distance Countdown on Compass

The compass already calculates distance. Make it update every second visually:

```jsx
// Already computed: distance = getDistance(lat, lng, hikerLat, hikerLng)
// Add color feedback:
const distanceColor = 
  distance < 50  ? 'var(--color-success)' :
  distance < 200 ? 'var(--color-warning)' :
  'var(--color-accent)';

<p style={{ color: distanceColor }} className="text-5xl font-bold mt-4">
  {distance != null ? `${distance}m` : '—'}
</p>
```

---

## 9. Phase 7 — Hiker Screen Improvements

### 9.1 — Fix check-out UI bug (BUG-05)

**File:** `src/pages/HikerHome.jsx`

Current broken logic:
```jsx
if (hiker.checkedIn) {
  // Shows "Checked in" and check-out button
  // But doesn't check hiker.checkedOut at all
}
```

Replace with proper state machine:

```jsx
const hikerStatus = 
  !hiker.checkedIn ? 'not_checked_in' :
  hiker.checkedOut ? 'checked_out' :
  'checked_in';

// Render based on hikerStatus:
{hikerStatus === 'not_checked_in' && <CheckInButton />}
{hikerStatus === 'checked_in' && (
  <>
    <p className="text-success">✓ Checked in</p>
    <CheckOutButton />
  </>
)}
{hikerStatus === 'checked_out' && (
  <>
    <p className="text-mid">You checked out</p>
    <Button onClick={handleReCheckIn}>Check Back In</Button>
    <p className="text-xs text-mid">Checked out by mistake? Check back in.</p>
  </>
)}
```

Add `handleReCheckIn` function:
```js
const handleReCheckIn = async () => {
  if (!hiker?.id) return;
  setCheckingIn(true);
  await updateDoc(doc(db, 'hikers', hiker.id), {
    checkedOut: false,
    checkedOutAt: null,
    // Keep checkedIn: true, re-capture location
    lastLocation: lat && lng ? { lat, lng, accuracy, timestamp: new Date() } : hiker.lastLocation,
  });
  setCheckingIn(false);
};
```

Add `reCheckInHiker` to `src/lib/firestore.js`:
```js
export async function reCheckInHiker(hikerId, location) {
  try {
    await updateDoc(doc(db, 'hikers', hikerId), {
      checkedOut: false,
      checkedOutAt: null,
      lastLocation: location ? { ...location, timestamp: new Date() } : null,
    });
  } catch (err) {
    console.error('reCheckInHiker:', err);
  }
}
```

### 9.2 — Post-SOS Status Screen (BUG-10)

After SOS is sent, the hiker home should switch to a status view:

```jsx
// When sosSent === true, show this instead of SOS button:
{sosSent && (
  <Card className="border-[var(--color-primary)] bg-[var(--color-primary-light)]">
    <CardContent className="pt-6 text-center">
      <p className="text-2xl font-bold text-[var(--color-primary-dark)]">
        Help is on the way
      </p>
      {assignedLeader && (
        <>
          <p className="text-lg mt-2">{assignedLeader.name} is responding</p>
          {leaderDistance && (
            <p className="text-3xl font-bold text-[var(--color-accent)] mt-2">
              {leaderDistance}m away
            </p>
          )}
        </>
      )}
      <p className="text-sm text-[var(--color-mid)] mt-4">
        Stay where you are. Keep this screen visible.
      </p>
    </CardContent>
  </Card>
)}
```

Subscribe to the active incident after SOS fires to get the assigned leader name and their real-time distance:

```js
// In HikerHome, after SOS is sent:
const [activeIncidentId, setActiveIncidentId] = useState(null);

// Subscribe to incident when ID is known
useEffect(() => {
  if (!activeIncidentId) return;
  return subscribeToIncident(activeIncidentId, (incident) => {
    setActiveIncident(incident);
    // If incident resolved, show "Help has arrived"
  });
}, [activeIncidentId]);
```

---

## 10. Phase 8 — Sound Alerts

### 10.1 — Create `src/lib/alertSound.js`

Use the Web Audio API to generate a sound without any external files (works offline):

```js
/**
 * Plays an SOS alert sound using Web Audio API.
 * No external files needed — works offline.
 * Call from a user gesture context or on first user interaction to unlock audio.
 */
export function playSOSAlert() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    
    const playBeep = (startTime, frequency = 880, duration = 0.2) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.5, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    // Three short beeps = SOS pattern
    const now = ctx.currentTime;
    playBeep(now,       880, 0.15);
    playBeep(now + 0.2, 880, 0.15);
    playBeep(now + 0.4, 1100, 0.3);
  } catch (err) {
    console.warn('SOS alert sound failed:', err);
  }
}
```

### 10.2 — Trigger Sound on New Incident

**Files:** `src/pages/LeaderHome.jsx`, `src/pages/OrganizerDashboard.jsx`

In both pages, detect when a NEW incident appears in the `allIncidents`/`myIncidents` array:

```js
const prevIncidentCount = useRef(0);

useEffect(() => {
  const currentCount = allIncidents.filter(i => i.status !== 'resolved').length;
  if (prevIncidentCount.current > 0 && currentCount > prevIncidentCount.current) {
    playSOSAlert();
  }
  prevIncidentCount.current = currentCount;
}, [allIncidents]);
```

**Important:** The Web Audio API requires a prior user gesture on most browsers to unlock audio. Add a one-time "unlock" on first click anywhere on the page:

```js
// In AuthProvider or a top-level component:
useEffect(() => {
  const unlockAudio = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      ctx.resume();
    }
    document.removeEventListener('click', unlockAudio);
  };
  document.addEventListener('click', unlockAudio);
  return () => document.removeEventListener('click', unlockAudio);
}, []);
```

---

## 11. Phase 9 — UI & UX Polish

### 11.1 — Bottom Navigation Bar

Create `src/components/layout/BottomNav.jsx` for hiker and leader pages. Use fixed positioning.

**Hiker nav items:**
- Home (`/hiker`) — House icon
- Emergency Card (`/emergency-card`) — Heart icon

**Leader nav items:**
- Dashboard (`/leader`) — Shield icon
- Incidents tab toggle (within page) — Bell icon with badge count

**Organizer:** No bottom nav — uses tabs within the dashboard.

### 11.2 — Empty State Components

Every list/table that can be empty must show a meaningful empty state, not a blank screen. Create reusable `src/components/shared/EmptyState.jsx`:

```jsx
export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="text-[var(--color-light)] mb-3">{icon}</div>}
      <p className="font-medium text-[var(--color-dark)]">{title}</p>
      {description && <p className="text-sm text-[var(--color-mid)] mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

Use this for: no hikers, no leaders, no incidents, no hike yet.

### 11.3 — Status Badge Component

Create `src/components/shared/StatusBadge.jsx` — a single consistent badge used everywhere:

```jsx
const STATUS_CONFIG = {
  active:     { label: 'Active',     color: 'bg-[var(--color-success)]  text-white' },
  upcoming:   { label: 'Upcoming',   color: 'bg-[var(--color-warning)]  text-black' },
  ended:      { label: 'Ended',      color: 'bg-[var(--color-mid)]      text-white' },
  responding: { label: 'Responding', color: 'bg-[var(--color-accent)]   text-white' },
  resolved:   { label: 'Resolved',   color: 'bg-[var(--color-success)]  text-white' },
  overdue:    { label: 'Overdue',    color: 'bg-[var(--color-warning)]  text-black' },
  in:         { label: 'In',         color: 'bg-[var(--color-success)]  text-white' },
  out:        { label: 'Out',        color: 'bg-[var(--color-mid)]      text-white' },
  'not-in':   { label: 'Not In',     color: 'bg-[var(--color-danger)]   text-white' },
};
```

### 11.4 — Toast Notifications

Add toasts for all state-changing actions. Current coverage is incomplete. Add toasts for:
- Leader joins hike: "Welcome [Name] — you're registered as a leader"
- Hiker checks in: "Checked in ✓"
- Hiker checks out: "Checked out. You can re-check in if needed."
- Hiker re-checks in: "Checked back in ✓"
- Organizer assigns leader: "[Leader] assigned to [Group]"
- Auto-assign complete: "Leaders auto-assigned to groups"
- Incident resolved: "Incident closed — help arrived"

### 11.5 — SOS Button Pulse Animation

The SOS button currently pulses always (`animate-pulse`). It should only pulse when checked in and hike is active. When the button is disabled, no animation.

```jsx
<Button
  className={cn(
    "w-full min-h-[80px] ...",
    !isDisabled && "animate-pulse"
  )}
/>
```

### 11.6 — Hiker Home Card Improvements

Add to the hike card:
- Meeting point (if set)
- Expected duration
- Difficulty badge
- Group name (if assigned) — currently shows raw groupId, not group name

To show group name, look up `hike.groups.find(g => g.id === hiker.groupId)?.name`.

### 11.7 — Page Headers with Back Navigation

All inner pages (Compass, EmergencyCard, IncidentView) need a header with back button:

```jsx
// src/components/layout/PageHeader.jsx
export default function PageHeader({ title, backTo }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-3 py-4 px-4 border-b border-[var(--color-border)]">
      <button onClick={() => navigate(backTo || -1)} className="min-w-[48px] min-h-[48px] flex items-center">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <h1 className="text-lg font-semibold">{title}</h1>
    </div>
  );
}
```

### 11.8 — Collapsible component

Add `@radix-ui/react-collapsible` to support the emergency card accordion on compass:

```bash
npm install @radix-ui/react-collapsible
npx shadcn@latest add collapsible
```

---

## 12. Phase 10 — Dead Code & Structure Cleanup

### 12.1 — Files to delete

```
src/App.jsx       ← Vite default, not used
src/App.css       ← Vite default, not used
src/index.css     ← Vite default, conflicts with globals.css
src/assets/       ← Contains react.svg, not needed
```

### 12.2 — Verify `main.jsx` imports

After deletion, `main.jsx` should only import:
```js
import '@/styles/globals.css';
import Router from './router.jsx';
import { Toaster } from '@/components/ui/toaster';
```

Remove any reference to `App.jsx` or `App.css`.

### 12.3 — Rename misleading variables

Throughout the codebase, rename:
- `myIncidents` → `assignedIncidents` in leader context
- `myIncidents` → `allIncidents` in organizer context
- `currentHike` → be explicit about whether it's from organizer hook or general hook

### 12.4 — Add `setDoc` import fix in `firestore.js`

The `enableIndexedDbPersistence` API is deprecated in Firebase v9.20+ and removed in v12. Since the project uses Firebase v12 (`"firebase": "^12.10.0"`), this will throw.

**File:** `src/lib/firebase.js`

Replace:
```js
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
// ...
enableIndexedDbPersistence(db).catch(...);
```

With:
```js
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
```

This is the correct Firebase v10+ API for offline persistence. This is a **critical bug** — the current code will throw an error in production silently and offline persistence will not work.

### 12.5 — Update `firestore.indexes.json`

Verify all required indexes are present. Add any missing ones:

```json
{
  "indexes": [
    {
      "collectionGroup": "incidents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "hikeId", "order": "ASCENDING" },
        { "fieldPath": "firedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "incidents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "hikeId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "firedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "leaders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "hikeId", "order": "ASCENDING" },
        { "fieldPath": "isActive", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "leaders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "hikeId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "hikers",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "hikeId", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## 13. New File Map

Files to **create** (new):

```
src/pages/JoinAsLeader.jsx
src/pages/JoinAsHiker.jsx
src/components/layout/RoleGuard.jsx
src/components/layout/LoadingScreen.jsx
src/components/layout/BottomNav.jsx
src/components/layout/PageHeader.jsx
src/components/organizer/LeaderTable.jsx
src/components/shared/EmptyState.jsx
src/components/shared/StatusBadge.jsx
src/hooks/useLeadersForHike.js
src/lib/alertSound.js
```

Files to **significantly modify**:

```
src/router.jsx                          ← add join routes + role guards
src/pages/Landing.jsx                   ← organizer PIN only
src/pages/Register.jsx                  ← read hikeId from sessionStorage
src/pages/OrganizerDashboard.jsx        ← tabs, leader table, invite links
src/pages/LeaderHome.jsx                ← tabs, all incidents, closest leader
src/pages/HikerHome.jsx                 ← checkout state machine, post-SOS screen
src/pages/Compass.jsx                   ← fix interval bug, emergency card, distance color
src/pages/IncidentView.jsx              ← full implementation
src/components/organizer/HikeForm.jsx   ← remove dead createLeadersForHike call
src/components/organizer/ManifestTable.jsx ← fix overdue logic, add emergency card link
src/hooks/useOrganizerHikes.js          ← rewrite to onSnapshot
src/hooks/useIncident.js                ← add error logging
src/lib/firebase.js                     ← fix deprecated persistence API
src/lib/firestore.js                    ← joinAsLeader update, new helpers, emergency contact denorm
src/lib/alertSound.js                   ← new file
```

Files to **delete**:

```
src/App.jsx
src/App.css
src/index.css
src/assets/react.svg
```

---

## 14. Firestore Schema Changes

### Leaders collection — new fields

```js
{
  // existing
  userId, hikeId, groupId, name, phone, isActive, lastLocation,
  
  // NEW
  roleTitle:  string,   // "First Aid" | "Group Lead" | "Sweep" | custom
  status:     string,   // "available" | "responding" | "arrived"
  joinedAt:   Timestamp,
}
```

### Incidents collection — new/updated fields

```js
{
  // existing
  hikeId, hikerId, hikerName, hikerMedicalInfo, type, note,
  coordinates, assignedLeaderId, assignedLeaderName,
  closestLeaderDistanceMeters, status, firedAt, respondingAt, resolvedAt, timeline,
  
  // UPDATED — hikerMedicalInfo now includes emergencyContact:
  hikerMedicalInfo: {
    bloodType, conditions, medications, allergies,
    emergencyContact: { name, phone, relation }  // ← NEW
  }
}
```

No migration needed — new incidents will have the new shape. Old incidents may not have `emergencyContact` in `hikerMedicalInfo` — always use optional chaining: `incident.hikerMedicalInfo?.emergencyContact?.name`.

---

## 15. Agent Standing Rules

These rules apply to every file touched in this refactor:

```
ALWAYS:
- Read this entire document before starting any phase
- Complete phases in order — do not skip ahead
- Use @/ alias for all imports
- Use CSS token variables for colors — never hardcode hex values
- Use shadcn/ui components for all atoms
- Every new component gets a unit test
- Every new hook returns { data, loading, error } shape
- Every data-fetching component handles loading + error + empty states
- Clean up all Firestore listeners in useEffect return functions
- Use optional chaining on all Firestore data fields

NEVER:
- Call Firebase directly from components
- Use inline styles
- Hardcode the organizer PIN — always read from import.meta.env
- Remove offline handling from any existing feature
- Use enableIndexedDbPersistence (deprecated in Firebase v12)
- Leave console.log statements
- Stack multiple setInterval calls — always clear before creating new

WHEN FIXING BUGS:
- Fix only what the bug description says
- Don't refactor surrounding code unless it's part of the same phase
- Write a comment referencing the BUG number: // Fix BUG-03

PHASE COMPLETION CHECK:
Before marking a phase done, verify:
□ All files in that phase are created or modified
□ No TypeScript/ESLint errors
□ New components have tests
□ App builds without error: npm run build
□ Relevant user flow works end-to-end
```

---

## Execution Order Summary

```
Phase 1  → Shareable links + Organizer PIN (unblocks multi-device testing)
Phase 2  → Route guards (safety net for all future work)
Phase 3  → Bug fixes (clean foundation)
Phase 4  → Leader onboarding + assignment logic
Phase 5  → Organizer dashboard overhaul
Phase 6  → Leader dashboard overhaul
Phase 7  → Hiker screen fixes
Phase 8  → Sound alerts
Phase 9  → UI polish
Phase 10 → Cleanup
```

After Phase 1 and 2, deploy immediately so you can test with real devices:
```bash
npm run build && firebase deploy --only hosting
```

---

*Trail Safe Refactor Plan — Phase 2 | Generated for AI agent use*
