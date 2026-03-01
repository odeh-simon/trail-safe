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
