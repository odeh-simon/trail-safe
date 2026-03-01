# Trail Safe — Phase 4: Final Polish & Cleanup
*AI Agent Implementation Guide*

> Read this entire document before writing a single line of code.
> Complete all fixes in order. Run `npm run build` after every section.

---

## Table of Contents

1. Bug Summary
2. Fix 1 — Desktop Top Navigation (BottomNav)
3. Fix 2 — Organizer Dashboard Two-Panel Desktop Layout
4. Fix 3 — Leader Dashboard Side-by-Side Desktop Layout
5. Fix 4 — Register Page Desktop Two-Column Layout
6. Fix 5 — IncidentView Desktop Two-Column Layout
7. Fix 6 — Toast Always on Top (All Screen Sizes)
8. Fix 7 — Dialog Opaque Overlay
9. Fix 8 — Popover/Select Opaque Background
10. Codebase Cleanup
11. Agent Completion Checklist

---

## 1. Bug Summary

| # | Issue | File(s) | Severity |
|---|-------|---------|----------|
| R-01 | BottomNav shows on desktop with no top nav alternative | `BottomNav.jsx` | HIGH |
| R-02 | Organizer dashboard is single column on desktop | `OrganizerDashboard.jsx` | HIGH |
| R-03 | Leader dashboard is tabs-only on desktop (no side-by-side) | `LeaderHome.jsx` | HIGH |
| R-04 | Register form is single column on desktop | `Register.jsx` | MEDIUM |
| R-05 | IncidentView is single column on desktop | `IncidentView.jsx` | MEDIUM |
| U-01 | Toast always renders at bottom — should be top on all screens | `toast.jsx` | HIGH |
| U-02 | Dialog overlay is semi-transparent (content bleeds through) | `dialog.jsx` | HIGH |
| U-03 | Popovers / Select dropdowns have transparent background | `select.jsx`, `popover.jsx` | HIGH |
| C-01 | Dead `createLeadersForHike` function still in firestore.js | `firestore.js` | LOW |
| C-02 | `agent.md` describes old 3-button landing — outdated | `agent.md` | LOW |
| C-03 | `TESTING-GUIDE.md` describes old flow — outdated | `TESTING-GUIDE.md` | LOW |
| C-04 | `firestore.indexes.json` missing `hikeId + status + firedAt` index | `firestore.indexes.json` | MEDIUM |

---

## 2. Fix 1 — `src/components/layout/BottomNav.jsx` — Desktop Top Navigation

**Problem (R-01):** The bottom nav renders at the bottom on all screen sizes, including desktop. The nav is also constrained to `max-w-[430px] mx-auto` which centers it on wide screens but leaves the rest of the screen empty. No desktop top nav exists.

**Replace the entire file:**

```jsx
import { Link, useLocation } from "react-router-dom";
import { Home, Heart, Shield } from "lucide-react";

const HIKER_LINKS = [
  { to: "/hiker", label: "Home", icon: <Home className="w-5 h-5" /> },
  { to: "/emergency-card", label: "Emergency Card", icon: <Heart className="w-5 h-5" /> },
];

const LEADER_LINKS = [
  { to: "/leader", label: "Dashboard", icon: <Shield className="w-5 h-5" /> },
];

/**
 * Navigation bar — bottom on mobile, top on desktop.
 * @param {{ role: 'hiker' | 'leader'; incidentCount?: number }}
 */
export default function BottomNav({ role, incidentCount = 0 }) {
  const pathname = useLocation().pathname;
  const links = role === "hiker" ? HIKER_LINKS : role === "leader" ? LEADER_LINKS : [];

  if (!links.length) return null;

  const navLinks = links.map((link) => {
    const isActive = pathname === link.to;
    const showBadge = link.label === "Dashboard" && incidentCount > 0;
    return (
      <Link
        key={link.to}
        to={link.to}
        className={`
          flex items-center gap-2 font-medium transition-colors relative
          /* Mobile: column layout */
          flex-col text-xs py-2 px-4
          /* Desktop: row layout */
          md:flex-row md:text-sm md:py-0 md:px-0
          ${isActive
            ? "text-[var(--color-primary)]"
            : "text-[var(--color-mid)] hover:text-[var(--color-dark)]"
          }
        `}
      >
        {link.icon}
        <span>{link.label}</span>
        {showBadge && (
          <span className="
            bg-[var(--color-danger)] text-white text-xs font-bold rounded-full
            min-w-[1.25rem] h-5 flex items-center justify-center px-1
            /* Mobile: absolute top-right of icon */
            absolute top-1 right-3
            /* Desktop: inline */
            md:static md:top-auto md:right-auto
          ">
            {incidentCount}
          </span>
        )}
      </Link>
    );
  });

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex justify-around items-center z-40 safe-area-bottom">
        {navLinks}
      </nav>

      {/* Desktop top nav */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] z-40 px-6 h-14 items-center gap-8 shadow-sm">
        <Link to="/" className="font-bold text-[var(--color-primary)] text-lg mr-2 flex items-center gap-2">
          🏔️ Trail Safe
        </Link>
        <div className="flex items-center gap-6">
          {navLinks}
        </div>
      </header>
    </>
  );
}
```

**Then add `md:pt-14` to the outermost container of `HikerHome` and `LeaderHome`** so content doesn't hide behind the fixed top nav:

In `HikerHome.jsx`:
```jsx
// Change:
<div className="min-h-screen bg-[var(--color-bg)] md:pt-16">
// To:
<div className="min-h-screen bg-[var(--color-bg)] md:pt-14">
```

In `LeaderHome.jsx`:
```jsx
// Change:
<div className="min-h-screen bg-[var(--color-bg)] md:pt-16">
// To:
<div className="min-h-screen bg-[var(--color-bg)] md:pt-14">
```

---

## 3. Fix 2 — `src/pages/OrganizerDashboard.jsx` — Two-Panel Desktop Layout

**Problem (R-02):** The organizer dashboard stacks everything in a single column. On desktop, the hike info, stats, and invite links should appear in a left sidebar (fixed width), with the tabs filling the remaining space on the right.

**Restructure the main layout inside the `currentHike && !showCreateForm` block:**

```jsx
// Replace the content inside "currentHike && !showCreateForm" with:
{currentHike && !showCreateForm && (
  <div className="flex flex-col lg:flex-row gap-6 items-start">

    {/* ── LEFT SIDEBAR (full width mobile, 320px desktop) ── */}
    <div className="w-full lg:w-80 flex-shrink-0 space-y-4">

      {/* Hike card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">{currentHike.name}</CardTitle>
            <Badge variant={
              currentHike.status === "active" ? "default" :
              currentHike.status === "ended" ? "secondary" : "outline"
            }>
              {currentHike.status}
            </Badge>
          </div>
          <p className="text-sm text-[var(--color-mid)]">{currentHike.trail}</p>
        </CardHeader>
      </Card>

      {/* Stats — 2 cols on mobile/tablet, 2 cols in sidebar */}
      <div className="grid grid-cols-2 gap-2">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-[var(--color-dark)]">{registered}</p>
          <p className="text-xs text-[var(--color-mid)]">Registered</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-[var(--color-success)]">{checkedIn}</p>
          <p className="text-xs text-[var(--color-mid)]">Checked In</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-[var(--color-mid)]">{checkedOut}</p>
          <p className="text-xs text-[var(--color-mid)]">Checked Out</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-[var(--color-danger)]">{activeIncidentCount}</p>
          <p className="text-xs text-[var(--color-mid)]">Incidents</p>
        </CardContent></Card>
      </div>

      {/* Invite links */}
      <Card>
        <CardHeader><CardTitle className="text-base">Invite Links</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-medium text-[var(--color-mid)] mb-1">Leader Link</p>
            <div className="flex gap-2">
              <Input readOnly value={`${window.location.origin}/join/leader/${currentHike.id}`} className="text-xs" />
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard?.writeText(`${window.location.origin}/join/leader/${currentHike.id}`)
                  .then(() => toast({ title: "Copied!" }));
              }}>Copy</Button>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-mid)] mb-1">Hiker Link</p>
            <div className="flex gap-2">
              <Input readOnly value={`${window.location.origin}/join/hiker/${currentHike.id}`} className="text-xs" />
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard?.writeText(`${window.location.origin}/join/hiker/${currentHike.id}`)
                  .then(() => toast({ title: "Copied!" }));
              }}>Copy</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hike controls */}
      <div className="space-y-2">
        {currentHike.status === "upcoming" && (
          <>
            <p className="text-xs text-[var(--color-mid)]">
              No minimum hikers or leaders required. Start when ready.
            </p>
            <Button className="w-full min-h-[48px]" onClick={handleStartHike} disabled={starting}>
              {starting ? "Starting..." : "Start Hike"}
            </Button>
          </>
        )}
        {currentHike.status === "active" && (
          <Button variant="destructive" className="w-full min-h-[48px]" onClick={handleEndHike} disabled={ending}>
            {ending ? "Ending..." : "End Hike"}
          </Button>
        )}
        <Button variant="outline" className="w-full min-h-[48px]" onClick={() => setShowCreateForm(true)}>
          Create New Hike
        </Button>
      </div>
    </div>

    {/* ── RIGHT MAIN PANEL (full width mobile, flex-1 desktop) ── */}
    <div className="flex-1 min-w-0">
      <Tabs defaultValue="overview" className="mb-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hikers">Hikers</TabsTrigger>
          <TabsTrigger value="leaders">Leaders</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
        </TabsList>

        {/* Keep existing TabsContent for each tab — no changes to content inside tabs */}
        {/* ... paste existing overview / hikers / leaders / incidents tab content here ... */}
      </Tabs>
    </div>

  </div>
)}
```

**Important:** Keep all existing `TabsContent` blocks exactly as-is. Only the outer structure changes — moving from a single column to flex-row on `lg:` breakpoint. Do not rewrite any of the tab contents.

---

## 4. Fix 3 — `src/pages/LeaderHome.jsx` — Side-by-Side Desktop Layout

**Problem (R-03):** On desktop, incidents and hikers are only accessible via tabs. On `md+` screens, they should show side-by-side.

**After the mobile stats cards (`sm:hidden` grid), replace the single `<Tabs>` block with:**

```jsx
{/* ── DESKTOP: side-by-side panels (hidden on mobile) ── */}
<div className="hidden md:grid md:grid-cols-2 gap-6 mb-4">
  {/* Incidents panel */}
  <div>
    <h2 className="font-semibold text-[var(--color-dark)] mb-3">
      Active Incidents
      {allIncidents.length > 0 && (
        <span className="ml-2 bg-[var(--color-danger)] text-white text-xs rounded-full px-2 py-0.5">
          {allIncidents.length}
        </span>
      )}
    </h2>
    {incidentsLoading ? (
      <p className="text-[var(--color-mid)] text-sm">Loading...</p>
    ) : allIncidents.length === 0 ? (
      <p className="text-[var(--color-mid)] text-sm py-8 text-center">No active incidents.</p>
    ) : (
      <div className="space-y-3">
        {allIncidents.map((inc) => {
          const isMine = inc.assignedLeaderId === leader.userId;
          const coord = inc.coordinates;
          const hasLoc = coord?.lat != null && coord?.lng != null && (coord.lat !== 0 || coord.lng !== 0);
          const mapUrl = hasLoc ? `https://www.google.com/maps?q=${coord.lat},${coord.lng}` : null;
          return (
            <Card key={inc.id} className={isMine ? "border-[var(--color-danger)]" : "border-[var(--color-warning)]"}>
              <CardContent className="pt-4">
                <p className="font-bold">{inc.hikerName}</p>
                <p className="text-sm text-[var(--color-mid)]">{inc.type} — {inc.note || "No note"}</p>
                <p className="text-xs text-[var(--color-mid)]">
                  {inc.assignedLeaderName || "Unassigned"}
                  {inc.closestLeaderDistanceMeters != null && ` · ~${inc.closestLeaderDistanceMeters}m`}
                </p>
                {hasLoc && (
                  <p className="text-xs text-[var(--color-mid)] mt-1">
                    {coord.lat?.toFixed(5)}, {coord.lng?.toFixed(5)}
                    {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-[var(--color-accent)] underline">Map</a>}
                    <Link to={`/compass/${inc.id}`} className="ml-2 text-[var(--color-accent)] underline">Compass</Link>
                  </p>
                )}
                {isMine && (
                  <div className="flex gap-2 mt-2">
                    {inc.status === "active" && (
                      <Button size="sm" className="flex-1 bg-[var(--color-warning)] hover:bg-[var(--color-warning)]/90" onClick={() => handleRespond(inc.id)}>
                        Respond
                      </Button>
                    )}
                    <Link to={`/compass/${inc.id}`}>
                      <Button size="sm" variant="outline">Compass</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    )}
  </div>

  {/* Hikers panel */}
  <div>
    <h2 className="font-semibold text-[var(--color-dark)] mb-3">
      Checked-In Hikers
      <span className="ml-2 text-[var(--color-success)] font-bold">{checkedIn}</span>
    </h2>
    <Card>
      <CardContent className="pt-4">
        {(hikers || []).filter((h) => h.checkedIn && !h.checkedOut).length === 0 ? (
          <p className="text-[var(--color-mid)] text-sm py-4 text-center">No hikers checked in.</p>
        ) : (
          <ul className="space-y-2">
            {(hikers || []).filter((h) => h.checkedIn && !h.checkedOut).map((h) => (
              <li key={h.id} className="flex justify-between py-1 border-b last:border-0">
                <span className="font-medium">{h.name}</span>
                <Link to={`/emergency-card?hikerId=${h.id}`} className="text-xs text-[var(--color-accent)] underline">Card</Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  </div>
</div>

{/* ── MOBILE: existing tabs (hidden on md+) ── */}
<div className="md:hidden">
  <Tabs defaultValue="incidents" className="mb-4">
    {/* Keep the existing Tabs component exactly as-is */}
    {/* ... paste existing Tabs JSX here ... */}
  </Tabs>
</div>
```

**Important:** The mobile `<Tabs>` block below `md:hidden` must be the exact same code as the existing `<Tabs>` component — do not rewrite it. Simply wrap it in `<div className="md:hidden">`.

---

## 5. Fix 4 — `src/pages/Register.jsx` — Two-Column Form on Desktop

**Problem (R-04):** Registration form is single column. On desktop, "Your Details" and "Emergency Contact" cards should appear side by side.

**Wrap the two `<Card>` sections in a responsive grid inside the `<form>`:**

```jsx
<form onSubmit={handleSubmit} className="space-y-6">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Card 1: Your Details — keep exactly as-is */}
    <Card>
      <CardHeader><CardTitle className="text-lg">Your Details</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {/* ... all existing fields unchanged ... */}
      </CardContent>
    </Card>

    {/* Card 2: Emergency Contact — keep exactly as-is */}
    <Card>
      <CardHeader><CardTitle className="text-lg">Emergency Contact</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {/* ... all existing fields unchanged ... */}
      </CardContent>
    </Card>
  </div>

  {/* Submit button and errors — full width below the grid */}
  {errors.submit && (
    <p className="text-sm text-[var(--color-danger)]" role="alert">{errors.submit}</p>
  )}
  <Button type="submit" className="w-full min-h-[48px]" size="lg" disabled={submitting}>
    {submitting ? "Registering..." : "Register"}
  </Button>
</form>
```

Do not change any field content, labels, validation, or logic. Only the outer grid wrapper changes.

---

## 6. Fix 5 — `src/pages/IncidentView.jsx` — Two-Column Desktop Layout

**Problem (R-05):** Incident view is single column. On desktop, medical info and location should appear side by side.

**Wrap the medical card and location card in a grid:**

```jsx
{/* Replace the two separate cards (Medical Info + Location) with: */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
  {/* Medical Info card — keep content exactly as-is */}
  <Card>
    <CardHeader><CardTitle className="text-base">Medical Info</CardTitle></CardHeader>
    <CardContent className="space-y-2 text-sm">
      {/* ... unchanged ... */}
    </CardContent>
  </Card>

  {/* Location card — keep content exactly as-is, only show if hasLoc */}
  {hasLoc && (
    <Card>
      <CardHeader><CardTitle className="text-base">Location</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {/* ... unchanged ... */}
      </CardContent>
    </Card>
  )}
</div>
{/* All other cards (assigned leader, timeline) stay below the grid, unchanged */}
```

---

## 7. Fix 6 — `src/components/ui/toast.jsx` — Toast Always on Top

**Problem (U-01):** The `ToastViewport` component uses `sm:bottom-0 sm:right-0 sm:top-auto` which puts toasts at the bottom-right on desktop. They must always appear at the top on all screen sizes.

**In `src/components/ui/toast.jsx`, find `ToastViewport` and replace its className:**

```jsx
// Remove:
"fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"

// Replace with:
"fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col p-4 sm:max-w-[420px]"
```

This pins the viewport to the top-right on all screen sizes. Toasts stack downward from the top. Remove the `flex-col-reverse` (which was making them stack upward from the bottom).

**Also update the toast animation in the same file** — the toast slide animation references `slide-in-from-top-full` and `slide-out-to-right-full` which is already correct for top-positioned toasts. No animation changes needed.

---

## 8. Fix 7 — `src/components/ui/dialog.jsx` — Opaque Overlay

**Problem (U-02):** The `DialogOverlay` uses `bg-black/80` which at 80% opacity still shows underlying content on some screens and with light backgrounds. More critically, the Dialog content itself needs a solid background.

**In `src/components/ui/dialog.jsx`:**

**Step 1 — Make overlay fully opaque:**
```jsx
// In DialogOverlay className, change:
"fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"

// To:
"fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
```

**Step 2 — Ensure DialogContent has a solid background:**
```jsx
// In DialogContent, add bg-[var(--color-surface)] to the className:
"fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-[var(--color-surface)] p-6 shadow-lg duration-200 ..."
```

The `bg-background` Tailwind alias maps to `var(--background)` which maps through the CSS token chain to `var(--color-bg)`. On some systems this resolves to transparent if the token chain has a gap. Using `bg-[var(--color-surface)]` (which is `#FFFFFF`) guarantees a solid white background.

---

## 9. Fix 8 — Select & Popover Opaque Backgrounds

**Problem (U-03):** Dropdown menus from shadcn Select and other Popover-based components show a transparent or semi-transparent background, causing content below to bleed through.

### 9.1 — `src/components/ui/select.jsx`

Find `SelectContent` and ensure the background is solid:

```jsx
// In SelectContent className, find the cn() call and ensure these classes are present:
// Add: bg-[var(--color-surface)] border border-[var(--color-border)] shadow-lg

// The full className for SelectContent should include:
"relative z-50 max-h-[--radix-select-content-available-height] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-[var(--color-surface)] text-[var(--color-dark)] shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ..."
```

Replace `bg-popover` with `bg-[var(--color-surface)]` and `text-popover-foreground` with `text-[var(--color-dark)]` everywhere in `select.jsx`.

### 9.2 — `src/styles/globals.css` — Fix Token Chain

The root cause of transparency issues is that `--popover` and `--card` map to `var(--color-surface)` but shadcn Tailwind config expects `hsl()` format, not CSS variable references. The fix is to ensure the CSS variables are defined correctly.

**In `src/styles/globals.css`, update the `:root` block:**

```css
@layer base {
  :root {
    /* Override shadcn defaults with explicit solid values */
    --background: 240 10% 97%;         /* matches --color-bg: #F0FDF4 approx */
    --foreground: 215 28% 17%;         /* matches --color-dark: #1E293B */
    --card: 0 0% 100%;                 /* white = --color-surface */
    --card-foreground: 215 28% 17%;
    --popover: 0 0% 100%;             /* white — critical for dropdowns */
    --popover-foreground: 215 28% 17%;
    --primary: 142 72% 37%;            /* --color-primary: #16A34A */
    --primary-foreground: 0 0% 100%;
    --secondary: 210 40% 97%;          /* --color-bg-alt */
    --secondary-foreground: 215 28% 17%;
    --muted: 210 40% 97%;
    --muted-foreground: 215 20% 35%;   /* --color-mid */
    --accent: 210 40% 97%;
    --accent-foreground: 215 28% 17%;
    --destructive: 0 84% 60%;          /* --color-danger: #EF4444 */
    --destructive-foreground: 0 0% 100%;
    --border: 214 32% 91%;             /* --color-border: #E2E8F0 */
    --input: 214 32% 91%;
    --ring: 142 72% 37%;
    --radius: 0.5rem;
  }
}
```

**Why this fixes the transparency:** shadcn's Tailwind plugin generates `bg-popover` as `hsl(var(--popover))`. When `--popover` is set to `var(--color-surface)`, the resulting CSS is `hsl(var(--color-surface))` which is invalid — `hsl()` expects numeric HSL values, not another CSS variable. Setting `--popover: 0 0% 100%` (HSL for white) makes `hsl(var(--popover))` = `hsl(0 0% 100%)` = solid white. This is the correct shadcn pattern.

**Keep `tokens.css` unchanged** — it defines the custom `--color-*` tokens used throughout the app via `var()` directly. The `globals.css` change only fixes the shadcn Tailwind token bridge.

---

## 10. Codebase Cleanup

### 10.1 — Delete Dead `createLeadersForHike` (C-01)

**File:** `src/lib/firestore.js`

Find and delete the entire `createLeadersForHike` function (approximately 25 lines, at the bottom of the file). It is never called from anywhere since `HikeForm.jsx` was updated to remove the call. Delete from the JSDoc comment to the closing `}`.

```js
// DELETE this entire function:
/**
 * Create leader docs when creating a hike. Call after createHike.
 * ...
 */
export async function createLeadersForHike(hikeId, groups, leaderProfiles = []) {
  // ...
}
```

### 10.2 — Update `TESTING-GUIDE.md` (C-03)

Replace the entire file with an accurate guide reflecting the current flow:

```markdown
# Trail Safe — Testing Guide

## Auth Flow (Current)

| Role | How They Access |
|------|----------------|
| Organizer | Landing → "Organizer Access" button → PIN dialog → /organizer |
| Leader | `/join/leader/:hikeId` link shared by organizer → fill name/phone/role → /leader |
| Hiker | `/join/hiker/:hikeId` link shared by organizer → auto-navigates to /register → /hiker |

**The landing page no longer has "I'm Hiking Today" or "I'm a Leader" buttons.**

## Test Flow

### 1. Organizer: Create & Start Hike

1. Open the app → **Organizer Access**
2. Enter PIN (default: `1234`)
3. **Create Hike** → fill name, trail, date → **Create Hike**
4. Hike appears with status **upcoming**
5. Click **Start Hike** → status changes to **active**
6. Copy the **Leader Invite Link** and **Hiker Invite Link** from the dashboard

### 2. Leader: Join via Invite Link

1. Open the **Leader Invite Link** in a different browser/incognito window
2. Fill in Full Name, Phone, Role/Title
3. Click **Join as Leader** → redirected to /leader dashboard

### 3. Hiker: Join via Invite Link

1. Open the **Hiker Invite Link** in a different browser/device
2. Auto-redirected to **/register**
3. Fill in name, phone, blood type, emergency contact
4. Click **Register** → redirected to /hiker
5. Click **Check In** (requires hike to be active + GPS available)
6. SOS button appears after check-in

### 4. SOS Flow Test

1. Hiker clicks **SOS** → select type → add note → **Send SOS**
2. Leader receives alert sound + incident appears on dashboard
3. Leader clicks **Respond** → opens Compass
4. Leader navigates to hiker GPS location
5. Leader clicks **Arrived — Close Incident**
6. Hiker sees "Help has arrived"

### 5. End Hike Test

1. Organizer clicks **End Hike**
2. All connected hiker/leader sessions are redirected to `/` within ~2 seconds
3. Invite links for the ended hike show "no longer valid"
4. Re-registering for ended hike shows "Registration Closed"

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| No sound on SOS | Audio context not unlocked | Tap/click anywhere on the page first |
| GPS required for check-in | Browser needs location permission | Allow when prompted; HTTPS required |
| Invite link "no longer valid" | Hike ended or wrong hikeId in URL | Get fresh links from active hike |
| Leader not dispatched | No leaders with GPS active | Leader must open Compass page for GPS |

## E2E Tests

```bash
npm run build && npm run preview
npm run test:e2e
```
```

### 10.3 — Update `agent.md` (C-02)

In `agent.md`, find the **User Roles** section and update it, plus add a note about the auth flow:

```markdown
## User Roles
organizer | leader | hiker
Role stored in Firestore /users/{uid}.role

## Auth Flow
- Organizer: enters PIN on Landing → navigates to /organizer
- Leader: opens /join/leader/:hikeId link → fills form → navigates to /leader
- Hiker: opens /join/hiker/:hikeId link → navigates to /register → /hiker
- RoleGuard protects all role-specific routes
- AuthProvider uses onSnapshot on /users/{uid} to watch role in real-time
- endHike() resets role to null for all participants → RoleGuard redirects all to /
- Landing page has NO role selection buttons — only Organizer Access PIN
```

### 10.4 — Add Missing Firestore Index (C-04)

**File:** `firestore.indexes.json`

Add the missing composite index for incident status filtering:

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

## 11. Agent Completion Checklist

Work through every item before marking this phase done:

```
RESPONSIVE LAYOUT
□ BottomNav: mobile bottom nav + desktop top nav both render correctly
□ HikerHome: hike info + check-in cards are side-by-side on sm+
□ LeaderHome: incidents + hikers show side-by-side on md+; tabs only on mobile
□ OrganizerDashboard: sidebar (stats, links, controls) + tabs panel on lg+
□ Register: two form cards side-by-side on md+
□ IncidentView: medical + location cards side-by-side on md+

UI FIXES
□ Toast always appears at top-right on ALL screen sizes
□ Dialog overlay is visually opaque (content below not visible)
□ Dialog content has solid white background
□ Select dropdowns have solid white background (not transparent)
□ All popovers have solid white background

CLEANUP
□ createLeadersForHike deleted from firestore.js
□ TESTING-GUIDE.md reflects current auth flow
□ agent.md updated with current auth flow description
□ firestore.indexes.json has all 5 indexes including status composite

BUILD
□ npm run build passes with 0 errors
□ npm run test:unit passes
□ No console errors on any page at 375px viewport
□ No console errors on any page at 1440px viewport
□ Mobile layout verified at 375px: no overflow, no broken nav
□ Desktop layout verified at 1440px: two panels visible, top nav visible
□ Toasts appear at top-right and are readable on both mobile and desktop
□ Dialog opened on mobile: overlay is dark, content readable
□ Select dropdown opened: background is solid white, options readable

DEPLOY
□ firebase deploy --only hosting
□ Smoke test on live URL: all 3 roles work end-to-end
□ Verify on real mobile device: bottom nav visible, toast at top
□ Verify on desktop browser at 1280px+: top nav, two-panel layout
```

---

## Standing Rules (Reminder)

```
ALWAYS:
- Use Tailwind responsive prefixes (sm:, md:, lg:) — never CSS media queries
- Use CSS token variables — never hardcode hex values
- Keep mobile layouts working — test at 375px after every change
- Use @/ alias for all imports

NEVER:
- Rewrite tab content or form fields when only restructuring layout
- Use localStorage for anything except the emergency card (already established)
- Change any Firestore query logic — layout changes only in this phase
- Add new npm dependencies
```

---

*Trail Safe Phase 4 — Final Polish: Responsive Layout + Modal Fixes + Cleanup | Agent Implementation Guide*
