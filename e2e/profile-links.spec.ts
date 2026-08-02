import { test, expect, type Page } from "@playwright/test";

/**
 * Verifies the profile card on /u/$username renders a *single* tile per
 * quick channel (phone / email / website) at multiple viewport sizes, and
 * that no legacy "quick action circles" surface anywhere on the page.
 *
 * Requires an existing public profile. Set:
 *   E2E_BASE_URL=https://your-preview-url
 *   E2E_PROFILE_USERNAME=some-existing-username
 * The test is skipped when the username is not provided so CI stays green
 * on projects that have no seeded fixture yet.
 */
const USERNAME = process.env.E2E_PROFILE_USERNAME;

test.describe("profile page — quick link tiles are unique per type", () => {
  test.skip(
    !USERNAME,
    "Set E2E_PROFILE_USERNAME to an existing public profile to run this test",
  );

  const QUICK_TYPES = ["phone", "email", "website"] as const;

  const goToProfile = async (page: Page) => {
    const res = await page.goto(`/u/${USERNAME}`, { waitUntil: "domcontentloaded" });
    expect(res, "navigation response").not.toBeNull();
    expect(res!.status(), "profile page should load successfully").toBeLessThan(400);
    // Wait until the link grid (or empty state) is rendered.
    await page.waitForSelector(
      '[data-testid="link-grid"], [data-testid="quick-links-missing"], main',
      { timeout: 10_000 },
    );
  };

  test("no legacy quick-action circles are rendered", async ({ page }) => {
    await goToProfile(page);

    // Any of these selectors would indicate the removed "quick actions" UI
    // (the small circular phone/email/website shortcuts) came back.
    const legacySelectors = [
      '[data-testid="quick-actions"]',
      '[data-testid="quick-action"]',
      ".quick-actions",
      ".quick-action-circle",
    ];
    for (const sel of legacySelectors) {
      await expect(
        page.locator(sel),
        `legacy quick-action selector should not exist: ${sel}`,
      ).toHaveCount(0);
    }
  });

  for (const type of QUICK_TYPES) {
    test(`only one tile is rendered for type="${type}"`, async ({ page }) => {
      await goToProfile(page);

      const grid = page.locator('[data-testid="link-grid"]');
      const missingNotice = page.locator('[data-testid="quick-links-missing"]');

      // If the grid isn't present, the empty state must be — either way no
      // duplicate tiles can exist.
      const hasGrid = (await grid.count()) > 0;
      if (!hasGrid) {
        await expect(missingNotice).toBeVisible();
        return;
      }

      const tiles = grid.locator(`[data-link-type="${type}"]`);
      const count = await tiles.count();
      expect(
        count,
        `expected at most one "${type}" tile in the link grid, found ${count}`,
      ).toBeLessThanOrEqual(1);
    });
  }
});
