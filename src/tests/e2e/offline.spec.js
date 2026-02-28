import { test, expect } from "@playwright/test";
import { waitForLanding, createAndStartHike } from "./helpers.js";

test.describe("Offline SOS", () => {
  test("offline banner appears when no connection", async ({ page, context }) => {
    await page.goto("/");
    await waitForLanding(page);
    await context.setOffline(true);
    await expect(page.getByText(/offline/i)).toBeVisible({ timeout: 10000 });
  });

  test("SOS shows queued message when offline", async ({ browser }) => {
    const ctx = await browser.newContext({
      geolocation: { latitude: -25.7479, longitude: 28.2293 },
      permissions: ["geolocation"],
    });
    const p = await ctx.newPage();

    await p.goto("/");
    await waitForLanding(p);
    await p.getByRole("button", { name: /i'm organizing/i }).click();
    await p.waitForURL("**/organizer");
    await createAndStartHike(p, { name: "Offline Test Hike", trail: "Test", date: "2030-12-31T09:00" });

    await p.goto("/");
    await p.getByRole("button", { name: /i'm hiking today/i }).click();
    await p.waitForURL("**/register");
    await p.getByLabel("Full Name *").fill("Offline Hiker");
    await p.getByLabel("Phone *").fill("+27821111111");
    await p.getByLabel("Contact Name *").fill("Contact");
    await p.getByLabel("Contact Phone *").fill("+27822222222");
    await p.getByLabel("Relationship *").fill("Friend");
    await p.selectOption('select[id="bloodType"]', "A+");
    await p.getByRole("button", { name: /register/i }).click();
    await p.waitForURL("**/hiker");
    await p.getByRole("button", { name: /check in/i }).click();
    await expect(p.getByText(/checked in/i)).toBeVisible({ timeout: 5000 });

    await ctx.setOffline(true);
    await p.getByRole("button", { name: /sos/i }).click();
    await p.getByRole("button", { name: /injury/i }).click();
    await p.getByRole("button", { name: /send sos/i }).click();

    await expect(p.getByText(/queued/i)).toBeVisible({ timeout: 5000 });

    await ctx.close();
  });
});
