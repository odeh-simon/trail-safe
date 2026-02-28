import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Register from "@/pages/Register";
import * as firestore from "@/lib/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { useActiveHike } from "@/hooks/useActiveHike";

vi.mock("@/lib/firestore");
vi.mock("@/hooks/useActiveHike");

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockHike = {
  id: "hike-1",
  name: "Saturday Hike #47",
  groups: [{ id: "g1", name: "Group A", leaderId: "l1", color: "#16A34A" }],
  date: { toDate: () => new Date() },
};

describe("HikerRegistration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { uid: "user-123" },
      role: "hiker",
      loading: false,
    });
    useActiveHike.mockReturnValue({
      hike: mockHike,
      loading: false,
      error: null,
    });
    firestore.registerHiker = vi.fn(() => Promise.resolve("hiker-123"));
    mockNavigate.mockClear();
  });

  it("submits form with valid data", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/full name/i), "John Doe");
    await user.type(screen.getByLabelText("Phone *"), "+27821234567");
    await user.type(screen.getByLabelText("Contact Name *"), "Jane Doe");
    await user.type(screen.getByLabelText("Contact Phone *"), "+27829876543");
    await user.type(screen.getByLabelText("Relationship *"), "spouse");
    await user.selectOptions(screen.getByLabelText("Blood Type *"), "O+");

    await user.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(firestore.registerHiker).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "John Doe",
          phone: "+27821234567",
          emergencyContact: expect.objectContaining({
            name: "Jane Doe",
            phone: "+27829876543",
            relation: "spouse",
          }),
          medicalInfo: expect.objectContaining({ bloodType: "O+" }),
        })
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith("/hiker");
  });

  it("shows validation errors for empty required fields", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    });

    expect(firestore.registerHiker).not.toHaveBeenCalled();
  });

  it("saves emergency card to localStorage on successful registration", async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/full name/i), "John Doe");
    await user.type(screen.getByLabelText("Phone *"), "+27821234567");
    await user.type(screen.getByLabelText("Contact Name *"), "Jane Doe");
    await user.type(screen.getByLabelText("Contact Phone *"), "+27829876543");
    await user.type(screen.getByLabelText("Relationship *"), "spouse");
    await user.selectOptions(screen.getByLabelText("Blood Type *"), "O+");

    await user.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith(
        "trailsafe_emergency_card",
        expect.stringContaining("John Doe")
      );
    });

    setItemSpy.mockRestore();
  });
});
