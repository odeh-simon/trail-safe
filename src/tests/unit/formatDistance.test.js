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
