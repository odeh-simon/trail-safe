import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.mock("@/lib/firebase", () => ({
  db: {},
  auth: {
    currentUser: { uid: "test-uid" },
    signInAnonymously: vi.fn(),
  },
}));

vi.mock("firebase/auth", () => ({
  signInAnonymously: vi.fn(() =>
    Promise.resolve({ user: { uid: "test-uid" } })
  ),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve({ id: "mock-id" })),
  updateDoc: vi.fn(() => Promise.resolve()),
  getDoc: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  onSnapshot: vi.fn(() => () => {}),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  arrayUnion: vi.fn((x) => x),
}));

Object.defineProperty(navigator, "geolocation", {
  value: {
    watchPosition: vi.fn((success) => {
      success({
        coords: { latitude: -25.7479, longitude: 28.2293, accuracy: 10 },
      });
      return 1;
    }),
    clearWatch: vi.fn(),
  },
});

window.DeviceOrientationEvent = {
  requestPermission: vi.fn(() => Promise.resolve("granted")),
};

// Fix for Radix Select in jsdom
if (typeof Element !== "undefined" && !Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
}
Element.prototype.scrollIntoView = vi.fn();
