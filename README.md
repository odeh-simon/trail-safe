# Trail Safe

**Real-time safety management for hiking groups.**

Trail Safe is a Progressive Web App built for hiking communities of 300–400+ members. It replaces paper sign-in sheets and radio check-ins with GPS-based check-in, one-tap SOS emergency alerts, and compass-guided leader dispatch — all designed to work on trails with no cell signal.

---

## The Problem

Large hiking groups face a real coordination gap when something goes wrong on the trail. Leaders don't know where hikers are. Organizers can't confirm who made it back. When a hiker is injured or lost, critical minutes are lost figuring out who is closest and how to reach them.

Trail Safe solves this with three role-specific tools that work together in real time.

---

## How It Works

### Three Roles

**Organizer** creates the hike, shares invite links, monitors the full group dashboard, and ends the hike when everyone is back safe.

**Leaders** join via invite link, receive GPS-targeted SOS alerts, and navigate to injured hikers using a built-in compass.

**Hikers** register their medical info and emergency contact once, check in at the trailhead with GPS, and can fire an SOS with one tap if something goes wrong.

### The SOS Flow

1. Hiker taps **SOS**, selects emergency type (Medical / Injury / Lost / Danger), adds an optional note, and sends
2. The system calculates haversine distance from all active leaders to the hiker's GPS coordinates and auto-assigns the nearest one
3. The assigned leader receives an audible alert and sees the incident on their dashboard
4. Leader taps **Respond** → opens the Compass screen, which shows real-time bearing and distance to the hiker
5. Leader arrives, taps **Arrived — Close Incident**
6. Hiker's screen updates to "Help has arrived"
7. Organizer sees the full incident log with timeline

### Offline First

The app is designed for trails with no cell signal:

- Firebase Firestore offline persistence is enabled — all writes are queued and sync when signal returns
- The GPS chip works without internet — location, compass bearing, and distance calculations all run on-device
- Each hiker's emergency card (blood type, medical conditions, emergency contact) is saved to `localStorage` and accessible offline as a PWA
- SOS alert sound uses the Web Audio API — no audio files needed, works offline

---

## Features

| Feature | Detail |
|---------|--------|
| **Invite link auth** | Leaders and hikers join via unique per-hike URLs — no accounts needed |
| **Organizer PIN** | Single PIN protects organizer access on the shared landing page |
| **GPS check-in** | Hiker location captured at check-in; re-check-in supported after accidental checkout |
| **Auto-dispatch** | Haversine distance ranks all leaders with active GPS; closest is auto-assigned on SOS fire |
| **Leader background GPS** | Leaders' location is written to Firestore every 10 seconds from the dashboard — no need to open Compass first |
| **Compass navigation** | Live bearing + distance to hiker, color-coded by proximity (green < 50m, yellow < 200m) |
| **SOS alert sound** | Three-beep Web Audio API alert fires on all connected leader and organizer screens |
| **Real-time hike termination** | Ending a hike resets all participant roles in Firestore; every connected device redirects within ~1 second via `onSnapshot` |
| **Emergency card** | Full medical info + emergency contact saved offline; viewable by leaders during an incident |
| **Hiker manifest** | Organizer sees registered / checked-in / checked-out counts with overdue detection |
| **Leader assignment** | Organizer can manually assign leaders to groups or auto-assign with one tap |
| **Responsive UI** | Mobile-first with full desktop two-panel layouts for organizer and leader dashboards |
| **PWA installable** | Installs to home screen on iOS and Android; service worker caches all assets |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Firebase Firestore (offline persistence via `persistentLocalCache`) |
| Auth | Firebase Anonymous Auth |
| State | Zustand |
| Location | Browser Geolocation API (`watchPosition`) |
| Compass | `DeviceOrientationEvent` (iOS 13+ permission handled) |
| Sound | Web Audio API (synthesized, no files) |
| Distance | Haversine formula (pure JS, no external library) |
| PWA | `vite-plugin-pwa` + Workbox |
| Testing | Vitest + Playwright |
| Deploy | Firebase Hosting |

---

## Architecture

```
src/
├── pages/           # One file per route (Landing, HikerHome, LeaderHome, OrganizerDashboard, ...)
├── components/
│   ├── layout/      # AuthProvider, RoleGuard, BottomNav, OfflineBanner
│   ├── hiker/       # SOSButton, SOSModal
│   ├── organizer/   # HikeForm, ManifestTable, LeaderTable
│   └── shared/      # EmptyState
├── hooks/           # useActiveHike, useIncident, useGeolocation, useLeaderProfile, ...
├── lib/
│   ├── firebase.js  # App init + offline persistence config
│   ├── firestore.js # All Firestore helpers (never call Firebase directly from components)
│   ├── haversine.js # getDistance, getBearing, findClosestLeader
│   └── alertSound.js# Shared Web Audio context + playSOSAlert + unlockAudioContext
└── store/
    └── useAuthStore.js  # Zustand: user, role, loading
```

### Key Design Decisions

**Role-based access via Firestore + onSnapshot**
Each user's role is stored in `/users/{uid}.role`. `AuthProvider` subscribes with `onSnapshot` — when the organizer ends a hike and roles are wiped to `null`, every connected device redirects within ~1 second without any polling.

**Invite links instead of role selection**
The landing page has no "I'm a hiker" / "I'm a leader" buttons. Leaders and hikers join via unique per-hike URLs generated by the organizer. This eliminates the shared-browser tab problem where two roles would overwrite each other's Firestore state.

**Denormalized incident docs**
When a hiker fires SOS, their full medical info and emergency contact are copied into the incident document. This means leaders can see critical medical details even if the original hiker profile is temporarily unavailable offline.

**Single stable GPS interval with ref**
Both `LeaderHome` and `Compass` use a `useRef` to track the latest coordinates and a single `setInterval` to write to Firestore. This avoids stale closures and prevents multiple overlapping intervals from accumulating.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project with Firestore and Anonymous Auth enabled
- Firebase CLI: `npm install -g firebase-tools`

### Setup

```bash
git clone https://github.com/odeh-simon/trail-safe
cd trail-safe
npm install
```

Create `.env.local`:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_ORGANIZER_PIN=1234
```

### Run

```bash
npm run dev
```

### Deploy

```bash
npm run build && firebase deploy --only hosting
```

To deploy Firestore indexes and rules:

```bash
firebase deploy --only hosting,firestore
```

---

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:int

# E2E tests (against built preview)
npm run test:e2e
```

See [TESTING-GUIDE.md](./TESTING-GUIDE.md) for the full end-to-end test flow with multiple devices.

---

## Live Demo

**[trail-safe-fafdd.web.app](https://trail-safe-fafdd.web.app)**

To test the full flow you need three separate browser sessions (incognito windows work):

| Session | Action |
|---------|--------|
| Session 1 | Open app → Organizer Access → PIN `1234` → Create hike → Start hike → Copy invite links |
| Session 2 | Open leader invite link → Fill name + role → Join |
| Session 3 | Open hiker invite link → Register → Check in → Fire SOS |

Session 2 (leader) will receive an audible alert and see the incident. Tap Respond → Compass to navigate to the hiker's GPS location.

---

## Firestore Data Model

```
/users/{uid}
  role: "organizer" | "leader" | "hiker" | null

/hikes/{hikeId}
  name, trail, date, status: "upcoming" | "active" | "ended"
  organizerId, groups: [{ id, name, color }]

/hikers/{docId}
  userId, hikeId, name, phone
  checkedIn, checkedOut, lastLocation
  medicalInfo: { bloodType, conditions, medications, allergies }
  emergencyContact: { name, phone, relation }

/leaders/{docId}
  userId, hikeId, name, phone, roleTitle
  isActive, status: "available" | "responding" | "arrived"
  lastLocation: { lat, lng, timestamp }

/incidents/{docId}
  hikeId, hikerId, hikerName
  type, note, coordinates, status: "active" | "responding" | "resolved"
  assignedLeaderId, assignedLeaderName, closestLeaderDistanceMeters
  hikerMedicalInfo: { ...medicalInfo, emergencyContact }
  firedAt, respondingAt, resolvedAt
  timeline: [{ event, timestamp, actorId }]
```

---

## Security Notes

Firestore rules require `request.auth != null` for all reads and writes — every user is authenticated anonymously via Firebase before accessing any data. For a production deployment, rules should be tightened to scope writes by role and validate document structure.

---

Built for the DEV Weekend Challenge!! hackathon by dev.to.