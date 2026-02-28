import { test, expect } from "@playwright/test";
import {
  waitForLanding,
  goToOrganizerWithPin,
  createAndStartHike,
  getInviteLinks,
} from "./helpers.js";

test.describe("Hiker Registration to Check-In", () => {
  test("full registration and check-in flow", async ({ page }) => {
    await page.goto("/");

    // Organizer creates hike (separate context so hiker gets fresh auth)
    const orgPage = await page.context().newPage();
    await orgPage.goto("/");
    await waitForLanding(orgPage);
    await goToOrganizerWithPin(orgPage);
    await createAndStartHike(orgPage, { name: "Reg Test Hike", trail: "Trail", date: "2030-06-15T08:00" });
    const { hikerUrl } = await getInviteLinks(orgPage);
    await orgPage.close();

    // Hiker uses invite link and lands on register
    await page.goto(hikerUrl);
    await page.waitForURL("**/register");

    // Fill registration form
    await page.getByLabel("Full Name *").fill("Test Hiker");
    await page.getByLabel("Phone *").fill("+27821234567");
    await page.getByLabel("Contact Name *").fill("Jane Doe");
    await page.getByLabel("Contact Phone *").fill("+27829876543");
    await page.getByLabel("Relationship *").fill("Spouse");
    await page.selectOption('select[id="bloodType"]', "O+");

    // Submit
    await page.getByRole("button", { name: /register/i }).click();
    await page.waitForURL("**/hiker");

    // Verify hiker home
    await expect(page.getByText(/reg test hike/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /check in/i })).toBeVisible();

    // Check in
    await page.getByRole("button", { name: /check in/i }).click();
    await expect(page.getByText(/checked in/i)).toBeVisible({ timeout: 5000 });
  });
});
