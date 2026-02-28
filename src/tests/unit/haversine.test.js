import { describe, it, expect } from "vitest";
import { getDistance, getBearing, findClosestLeader } from "@/lib/haversine";

describe("getDistance", () => {
  it("returns 0 for same coordinates", () => {
    expect(getDistance(-25.74, 28.22, -25.74, 28.22)).toBe(0);
  });
  it("calculates ~111km per degree of latitude", () => {
    expect(getDistance(0, 0, 1, 0)).toBeCloseTo(111195, -2);
  });
  it("returns meters not km", () => {
    const d = getDistance(-25.74, 28.22, -25.741, 28.22);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(200);
  });
});

describe("getBearing", () => {
  it("returns 0 for due north", () => {
    expect(getBearing(0, 0, 1, 0)).toBeCloseTo(0, 0);
  });
  it("returns 90 for due east", () => {
    expect(getBearing(0, 0, 0, 1)).toBeCloseTo(90, 0);
  });
  it("returns 0-360 range", () => {
    const b = getBearing(-25.74, 28.22, -25.8, 28.3);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});

describe("findClosestLeader", () => {
  const leaders = [
    { userId: "l1", name: "Alice", lastLocation: { lat: -25.74, lng: 28.22 } },
    { userId: "l2", name: "Bob", lastLocation: { lat: -25.8, lng: 28.3 } },
    { userId: "l3", name: "Carol", lastLocation: null },
  ];

  it("returns closest leader", () => {
    expect(findClosestLeader(-25.741, 28.221, leaders).userId).toBe("l1");
  });
  it("ignores leaders without GPS", () => {
    expect(findClosestLeader(-25.74, 28.22, [leaders[2]])).toBeNull();
  });
  it("attaches distanceMeters", () => {
    expect(
      findClosestLeader(-25.741, 28.221, leaders).distanceMeters
    ).toBeGreaterThan(0);
  });
});
