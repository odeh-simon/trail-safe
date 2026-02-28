import { test, expect } from "@playwright/test";
import { waitForLanding, createAndStartHike } from "./helpers.js";

test.describe("Hiker Registration to Check-In", () => {
  test("full registration and check-in flow", async ({ page }) => {
    await page.goto("/");

    // Organizer creates hike (separate context so hiker gets fresh auth)
    const orgPage = await page.context().newPage();
    await orgPage.goto("/");
    await waitForLanding(orgPage);
    await orgPage.getByRole("button", { name: /i'm organizing/i }).click();
    await orgPage.waitForURL("**/organizer");
    await createAndStartHike(orgPage, { name: "Reg Test Hike", trail: "Trail", date: "2030-06-15T08:00" });
    await orgPage.close();

    // Hiker selects role and lands on register
    await page.getByRole("button", { name: /i'm hiking today/i }).click();
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
