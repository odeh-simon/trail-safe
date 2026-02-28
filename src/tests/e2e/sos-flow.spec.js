import { test, expect } from "@playwright/test";
import { waitForLanding, createAndStartHike } from "./helpers.js";

test.describe("Full SOS Emergency Flow", () => {
  test("hiker fires SOS and leader gets dispatched", async ({ browser }) => {
    const hikerCtx = await browser.newContext({
      geolocation: { latitude: -25.7479, longitude: 28.2293 },
      permissions: ["geolocation"],
    });
    const leaderCtx = await browser.newContext({
      geolocation: { latitude: -25.748, longitude: 28.229 },
      permissions: ["geolocation"],
    });

    const hikerPage = await hikerCtx.newPage();
    const leaderPage = await leaderCtx.newPage();

    const orgPage = await browser.newPage();
    await orgPage.goto("/");
    await waitForLanding(orgPage);
    await orgPage.getByRole("button", { name: /i'm organizing/i }).click();
    await orgPage.waitForURL("**/organizer");
    await createAndStartHike(orgPage, { name: "E2E Test Hike", trail: "Test Trail", date: "2030-12-31T09:00" });
    await orgPage.close();

    await leaderPage.goto("/");
    await leaderPage.getByRole("button", { name: /i'm a leader/i }).click();
    await leaderPage.waitForURL("**/leader");
    await leaderPage.getByRole("button", { name: /join as leader/i }).click();

    await hikerPage.goto("/");
    await hikerPage.getByRole("button", { name: /i'm hiking today/i }).click();
    await hikerPage.waitForURL("**/register");
    await hikerPage.getByLabel("Full Name *").fill("E2E Hiker");
    await hikerPage.getByLabel("Phone *").fill("+27821234567");
    await hikerPage.getByLabel("Contact Name *").fill("Emergency Contact");
    await hikerPage.getByLabel("Contact Phone *").fill("+27829876543");
    await hikerPage.getByLabel("Relationship *").fill("Spouse");
    await hikerPage.selectOption('select[id="bloodType"]', "O+");
    await hikerPage.getByRole("button", { name: /register/i }).click();
    await hikerPage.waitForURL("**/hiker");

    await hikerPage.getByRole("button", { name: /check in/i }).click();
    await expect(hikerPage.getByText(/checked in/i)).toBeVisible({ timeout: 5000 });

    await hikerPage.getByRole("button", { name: /sos/i }).click();
    await hikerPage.getByRole("button", { name: /medical/i }).click();
    await hikerPage.getByPlaceholder(/describe/i).fill("Chest pain");
    await hikerPage.getByRole("button", { name: /send sos/i }).click();

    await expect(hikerPage.getByText(/help is on the way|SOS sent/i)).toBeVisible({
      timeout: 10000,
    });

    await expect(leaderPage.getByText(/chest pain|medical/i)).toBeVisible({
      timeout: 10000,
    });

    await leaderPage.getByRole("button", { name: /respond/i }).first().click();
    await leaderPage.waitForURL("**/compass/**");
    await expect(leaderPage.getByText(/m/i)).toBeVisible({ timeout: 5000 });

    await leaderPage.getByRole("button", { name: /arrived/i }).click();
    await leaderPage.waitForURL("**/leader");

    await hikerCtx.close();
    await leaderCtx.close();
  });
});
