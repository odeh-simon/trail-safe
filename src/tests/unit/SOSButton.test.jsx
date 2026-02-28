import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import SOSButton from "@/components/hiker/SOSButton";

describe("SOSButton", () => {
  it("renders with correct label", () => {
    render(<SOSButton onPress={vi.fn()} hikeStatus="active" />);
    expect(screen.getByRole("button", { name: /sos/i })).toBeInTheDocument();
  });
  it("calls onPress when clicked", () => {
    const onPress = vi.fn();
    render(<SOSButton onPress={onPress} hikeStatus="active" />);
    fireEvent.click(screen.getByRole("button", { name: /sos/i }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it("is disabled when hike is not active", () => {
    render(<SOSButton onPress={vi.fn()} hikeStatus="upcoming" />);
    expect(screen.getByRole("button", { name: /sos/i })).toBeDisabled();
  });
  it("meets minimum touch target height", () => {
    render(<SOSButton onPress={vi.fn()} hikeStatus="active" />);
    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/min-h-\[80px\]|h-20/);
  });
});
