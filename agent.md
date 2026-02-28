# Trail Safe — AI Agent Instructions

## Project Overview
Trail Safe is a React PWA for a hiking community of 300-400+ hikers.
It handles pre-hike registration, real-time check-in/out, SOS emergency
pinging with GPS coordinates, and compass-based leader dispatch.
It must work OFFLINE on trails with no cell signal.

## Tech Stack
- React 18 + Vite
- Firebase Firestore (offline persistence enabled)
- Firebase Auth (anonymous + phone)
- Zustand (state management)
- shadcn/ui + Tailwind CSS (design system)
- Vitest + Playwright (testing)

## Critical Constraints
1. OFFLINE FIRST: Every feature must degrade gracefully with no internet.
2. GPS works offline (device GPS chip). Do not assume internet for location.
3. Compass bearing works offline (DeviceOrientationEvent).
4. All writes are queued offline and sync when signal returns.
5. The app must be installable as a PWA.

## File Conventions
- Components: PascalCase .jsx files
- Hooks: camelCase starting with "use", in src/hooks/
- All Firebase calls go through src/lib/firestore.js helpers
- Never call Firebase directly from components
- Use @/ alias for src/ imports
- All colors via CSS tokens — never hardcode hex values

## State Management Rules
- Server state (Firestore data) → custom hooks with onSnapshot
- UI state → local useState
- Cross-component state → Zustand stores

## Component Rules
- Use shadcn/ui atoms for all UI
- No inline styles — Tailwind classes only
- Every component needs a corresponding unit test
- Use semantic HTML

## Testing Rules
- Unit: every utility function and hook must be tested
- Integration: every page must have integration tests
- E2E: the full SOS flow must have an E2E test
- Mock Firebase in all unit/integration tests

## User Roles
organizer | leader | hiker
Role stored in Firestore /users/{uid}.role
