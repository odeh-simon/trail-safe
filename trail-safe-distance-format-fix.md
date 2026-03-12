# Trail Safe — Distance Formatting Fix Plan

## Problem

`closestLeaderDistanceMeters` is a raw float from the haversine calculation (e.g. `1523.847362`).
It is displayed without rounding in three places, producing ugly output like `~1523.847362m`.
Additionally, large distances should display as km for readability (e.g. `1.5km` instead of `1524m`).

---

## Step 1 of 3 — Create the helper function

**File to create:** `src/lib/formatDistance.js`

**Create this file with the following content:**

```js
/**
 * Formats a distance in meters into a human-readable string.
 * - Below 1000m: rounds to nearest whole meter → "42m"
 * - 1000m and above: converts to km with 1 decimal place → "1.5km"
 * - Null or undefined input: returns "—"
 *
 * @param {number|null|undefined} meters
 * @returns {string}
 */
export function formatDistance(meters) {
  if (meters == null || isNaN(meters)) return "—";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters)}m`;
}
```

**Why a separate file:**
- Keeps it testable in isolation
- Follows the project convention of putting pure utility functions in `src/lib/`
- Can be imported anywhere without coupling to a component

---

## Step 2 of 3 — Apply the helper in all three display locations

### Location A — `src/pages/HikerHome.jsx`

**Find:**
```js
~{activeIncident.closestLeaderDistanceMeters}m away
```

**Replace with:**
```js
import { formatDistance } from "@/lib/formatDistance";

// in JSX:
~{formatDistance(activeIncident.closestLeaderDistanceMeters)} away
```

> Note: add the import at the top of the file with the other imports.
> Remove the hardcoded `m` suffix — `formatDistance` includes the unit.

---

### Location B — `src/pages/LeaderHome.jsx`

This value is rendered in **two places** in the same file (mobile tab and desktop view). Both use the same pattern.

**Find (appears twice):**
```js
{inc.closestLeaderDistanceMeters != null && ` · ~${inc.closestLeaderDistanceMeters}m`}
```

**Replace both occurrences with:**
```js
import { formatDistance } from "@/lib/formatDistance";

// in JSX:
{inc.closestLeaderDistanceMeters != null && ` · ~${formatDistance(inc.closestLeaderDistanceMeters)}`}
```

> Note: add the import once at the top of the file.

---

### Location C — `src/pages/IncidentView.jsx`

**Find:**
```js
~{incident.closestLeaderDistanceMeters}m
```

**Replace with:**
```js
import { formatDistance } from "@/lib/formatDistance";

// in JSX:
~{formatDistance(incident.closestLeaderDistanceMeters)}
```

> Note: add the import at the top of the file.
> Remove the hardcoded `m` suffix.

---

## Step 3 of 3 — Add a unit test

**File to create:** `src/tests/unit/formatDistance.test.js`

```js
import { describe, it, expect } from "vitest";
import { formatDistance } from "@/lib/formatDistance";

describe("formatDistance", () => {
  it("returns — for null", () => {
    expect(formatDistance(null)).toBe("—");
  });

  it("returns — for undefined", () => {
    expect(formatDistance(undefined)).toBe("—");
  });

  it("rounds meters below 1000", () => {
    expect(formatDistance(42.7)).toBe("43m");
    expect(formatDistance(999.9)).toBe("1000m");
  });

  it("converts to km at exactly 1000", () => {
    expect(formatDistance(1000)).toBe("1.0km");
  });

  it("converts to km above 1000 with 1 decimal", () => {
    expect(formatDistance(1523.847)).toBe("1.5km");
    expect(formatDistance(10200)).toBe("10.2km");
  });

  it("rounds 0 to 0m", () => {
    expect(formatDistance(0)).toBe("0m");
  });
});
```

---

## Files Changed Summary

| File | Change |
|------|--------|
| `src/lib/formatDistance.js` | CREATE — pure helper function |
| `src/tests/unit/formatDistance.test.js` | CREATE — unit tests |
| `src/pages/HikerHome.jsx` | Import + use `formatDistance`, remove hardcoded `m` |
| `src/pages/LeaderHome.jsx` | Import + use `formatDistance` in 2 places, remove hardcoded `m` |
| `src/pages/IncidentView.jsx` | Import + use `formatDistance`, remove hardcoded `m` |

---

## What NOT to Change

- `Compass.jsx` already uses `Math.round(getDistance(...))` and displays `${distance}m` directly from a live calculation — this is fine as it will always be a short trail distance. Optionally `formatDistance` could be applied here too but it is not broken.
- `firestore.js` — do not change how `closestLeaderDistanceMeters` is stored. It should remain the raw float in Firestore so future consumers can apply their own formatting or thresholds.
- `haversine.js` — do not round inside `findClosestLeader`. Raw precision is needed for the sorting comparison that picks the nearest leader.

---

## Verification

After applying, these are the expected display outputs:

| Raw value | Before | After |
|-----------|--------|-------|
| `42.847362` | `~42.847362m` | `~43m` |
| `523.12` | `~523.12m` | `~523m` |
| `999.9` | `~999.9m` | `~1000m` |
| `1000` | `~1000m` | `~1.0km` |
| `1523.847` | `~1523.847m` | `~1.5km` |
| `10200` | `~10200m` | `~10.2km` |
| `null` | crashes or shows nothing | `—` |
