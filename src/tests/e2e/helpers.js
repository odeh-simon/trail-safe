/**
 * E2E test helpers for Trail Safe
 */

/**
 * Waits for the Landing page to be ready (auth loaded, role selection visible).
 * Use before clicking role buttons.
 * @param {import('@playwright/test').Page} page
 * @param {{ timeout?: number }} opts
 */
export async function waitForLanding(page, opts = {}) {
  const { timeout = 30000 } = opts;
  await page.getByRole("heading", { name: /trail safe/i }).waitFor({ state: "visible", timeout });
  await page.getByRole("button", { name: /i'm organizing/i }).waitFor({ state: "visible", timeout });
}

/**
 * Fills organizer hike form, creates hike, and starts it.
 * Assumes page is on /organizer.
 * @param {import('@playwright/test').Page} page
 * @param {{ name?: string; trail?: string; date?: string }} opts
 */
export async function createAndStartHike(page, opts = {}) {
  const { name = "E2E Test Hike", trail = "Test Trail", date = "2030-12-31T09:00" } = opts;
  await page.getByRole("button", { name: /create hike/i }).first().waitFor({ state: "visible", timeout: 15000 });
  await page.getByRole("button", { name: /create hike/i }).first().click();
  await page.getByLabel("Hike Name").waitFor({ state: "visible", timeout: 5000 });
  await page.getByLabel("Hike Name").fill(name);
  await page.getByLabel("Trail").fill(trail);
  await page.getByLabel("Date").fill(date);
  await page.locator("form").getByRole("button", { name: /create hike/i }).click();
  // Wait for form to close and hike to appear (refetch + render)
  await page.getByText(name, { exact: false }).waitFor({ state: "visible", timeout: 25000 });
  await page.getByRole("button", { name: /start hike/i }).waitFor({ state: "visible", timeout: 5000 });
  await page.getByRole("button", { name: /start hike/i }).click();
}
