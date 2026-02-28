import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ensureAuth,
  setUserProfile,
  getUserRole,
} from "@/lib/firestore";
import { auth } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";

vi.mock("@/lib/firebase", () => ({
  db: {},
  auth: { currentUser: null },
}));

vi.mock("firebase/auth", () => ({
  signInAnonymously: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => true, data: () => ({ role: "hiker" }) })),
}));

describe("ensureAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.currentUser = null;
  });

  it("returns current user if already signed in", async () => {
    const mockUser = { uid: "existing-uid" };
    auth.currentUser = mockUser;

    const result = await ensureAuth();

    expect(result).toBe(mockUser);
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it("calls signInAnonymously when no current user", async () => {
    const mockUser = { uid: "new-uid" };
    signInAnonymously.mockResolvedValueOnce({ user: mockUser });

    const result = await ensureAuth();

    expect(signInAnonymously).toHaveBeenCalledWith(auth);
    expect(result).toEqual(mockUser);
  });
});

describe("setUserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls setDoc with merge", async () => {
    await setUserProfile("uid-1", {
      name: "Test",
      role: "hiker",
      phone: "+123",
    });

    expect(setDoc).toHaveBeenCalledTimes(1);
    const [, data, options] = setDoc.mock.calls[0];
    expect(data).toMatchObject({ uid: "uid-1", name: "Test", role: "hiker", phone: "+123" });
    expect(options).toEqual({ merge: true });
  });
});

describe("getUserRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ role: "leader" }) });
  });

  it("returns role from user document", async () => {
    const role = await getUserRole("uid-1");
    expect(role).toBe("leader");
  });

  it("returns null when document does not exist", async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false });
    const role = await getUserRole("uid-1");
    expect(role).toBeNull();
  });
});
