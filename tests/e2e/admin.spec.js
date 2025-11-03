const { test } = require('@playwright/test');

// Skipped in default CI: requires seeded permissions and role claims.
test.describe.skip('Admin access', () => {
  test('loads Admin UI (bootstrap/mock)', async ({ page }) => {
    await page.goto('/admin');
  });
});
