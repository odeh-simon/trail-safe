/**
 * E2E test helpers for Trail Safe
 */

/**
 * Waits for the Landing page to be ready (auth loaded, Organizer Access visible).
 * @param {import('@playwright/test').Page} page
 * @param {{ timeout?: number }} opts
 */
export async function waitForLanding(page, opts = {}) {
  const { timeout = 30000 } = opts;
  await page.getByRole("heading", { name: /trail safe/i }).waitFor({ state: "visible", timeout });
  await page.getByRole("button", { name: /organizer access/i }).waitFor({ state: "visible", timeout });
}

/**
 * Opens Organizer Access PIN dialog, enters PIN (default 1234), navigates to /organizer.
 * Call after waitForLanding.
 * @param {import('@playwright/test').Page} page
 * @param {{ pin?: string }} opts
 */
export async function goToOrganizerWithPin(page, opts = {}) {
  const { pin = "1234" } = opts;
  await page.getByRole("button", { name: /organizer access/i }).click();
  await page.getByPlaceholder(/4-digit pin/i).waitFor({ state: "visible", timeout: 5000 });
  await page.getByPlaceholder(/4-digit pin/i).fill(pin);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL("**/organizer", { timeout: 10000 });
}

/**
 * Returns invite URLs from the organizer dashboard (Share Invite Links card).
 * Call after createAndStartHike when a hike is active.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{ leaderUrl: string; hikerUrl: string }>}
 */
export async function getInviteLinks(page) {
  const inputs = page.locator('input[readonly]');
  const leaderUrl = await inputs.nth(0).inputValue();
  const hikerUrl = await inputs.nth(1).inputValue();
  return { leaderUrl, hikerUrl };
}

/**
 * Completes leader join flow via invite link. Assumes page has navigated to /join/leader/:hikeId.
 * @param {import('@playwright/test').Page} page
 * @param {{ name?: string; phone?: string; roleTitle?: string }} opts
 */
export async function joinAsLeaderViaLink(page, opts = {}) {
  const { name = "E2E Leader", phone = "+27821111111", roleTitle = "First Aid" } = opts;
  await page.waitForURL("**/join/leader/**", { timeout: 10000 });
  await page.getByLabel(/full name/i).fill(name);
  await page.getByLabel(/^phone/i).fill(phone);
  await page.getByLabel(/role.*title/i).fill(roleTitle);
  await page.getByRole("button", { name: /join as leader/i }).click();
  await page.waitForURL("**/leader", { timeout: 10000 });
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
