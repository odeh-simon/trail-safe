# Trail Safe — Testing Guide

## Constraints (Organizer → Start Hike)

| Requirement | Needed? | Notes |
|-------------|---------|-------|
| Minimum hikers | **No** | You can start with 0 registered hikers |
| Leaders assigned | **No** | Leaders join after the hike is created; SOS still works |
| Groups created | **No** | Default 1 group is created with the hike |

**You can start a hike as soon as it’s created.** Hikers can register before or after the hike is started; they can only check in once the hike is active.

---

## End-to-End Test Flow

### 1. Organizer: Create & Start Hike

1. Open the app → **I'm Organizing**
2. **Create Hike** → fill name, trail, date (required)
3. Click **Create Hike** in the form
4. You should see the hike card with status badge **upcoming**
5. Helper text: *"No minimum hikers or leaders required. Start when ready — hikers can then check in."*
6. Click **Start Hike**
7. Button shows "Starting..."
8. Toast: **Hike started** — Hikers can now check in.
9. Status badge changes to **active**
10. Button changes to **End Hike**

### 2. Hiker: Register & Check In

1. Open the app in a **new tab** (or different browser)
2. **I'm Hiking Today** → goes to Register
3. If no active/upcoming hike exists: *"No upcoming or active hike found"* → **Back to Home**
4. With an active or upcoming hike: see the registration form
5. Fill required fields (name, phone, emergency contact, blood type)
6. Click **Register**
7. Redirected to Hiker Home with the hike card
8. **Check In** button is enabled only when:
   - Hike status is **active** (organizer has started it)
   - GPS location is available (allow geolocation when prompted)
9. Click **Check In** → button shows "Checked in"
10. SOS button becomes visible after check-in

### 3. Leader (Optional)

1. **I'm a Leader**
2. **Join as Leader** on Leader Home
3. Leader can receive SOS alerts and respond with compass navigation

---

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Start Hike does nothing | Old bug: no refetch after start | Fixed: refetch + toast feedback |
| Hiker Check In stays disabled | Old bug: hiker page didn’t get hike status updates | Fixed: `useActiveHike` uses real-time listener |
| "No upcoming or active hike" | No hike created yet, or all hikes ended | Organizer creates a hike first |
| GPS required for check-in | Browser needs location permission | Allow when prompted; use HTTPS (required for geolocation) |

---

## E2E Tests

```bash
npm run build && npm run preview   # Start preview server
npm run test:e2e                   # Runs against preview
```

---

## Visual Flow

```
Landing
  ├── I'm Organizing → Organizer Dashboard
  │     ├── Create Hike → form → Create
  │     ├── Hike card (upcoming)
  │     ├── Start Hike → toast + status → active
  │     └── End Hike (when active)
  │
  ├── I'm a Leader → Leader Home → Join as Leader
  │
  └── I'm Hiking Today → Register (if hike exists)
        └── Register → Hiker Home
              └── Check In (enabled when hike active + GPS)
                    └── SOS button appears
```
