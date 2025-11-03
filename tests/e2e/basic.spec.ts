import { test, expect } from '@playwright/test';

// Basic smoke covering auth-ready dashboard and navigation to report page
// Test environment is set to mock auth + emulators via playwright.config.ts

test('loads dashboard after auth and opens report page', async ({ page }) => {
  await page.goto('/?test=mock');

  const dashboardHeading = page.getByRole('heading', { name: /COCO Station Dashboard/i });
  await expect(dashboardHeading).toBeVisible({ timeout: 20000 });

  // Navigate explicitly to the report page and verify URL and form presence
  await page.goto('/report');
  await expect(page).toHaveURL(/\/report$/);
  // Accept either heading or the form test-id to reduce flakiness
  const heading = page.getByRole('heading', { name: 'New Issue Report', exact: true });
  const form = page.getByTestId('issue-form');
  await Promise.race([
    heading.waitFor({ state: 'visible', timeout: 15000 }),
    form.waitFor({ state: 'visible', timeout: 15000 }),
  ]);

  // Navigate back to dashboard and verify again
  await page.goto('/');
  await expect(dashboardHeading).toBeVisible({ timeout: 10000 });
});
