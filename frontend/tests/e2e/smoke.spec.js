const { test, expect } = require('@playwright/test');

test.describe('Smoke', () => {
  test('submit a new issue from /report', async ({ page }) => {
    await page.goto('/report?test=mock');
    await expect(page.getByRole('heading', { name: 'New Issue Report', exact: true })).toBeVisible();

    // Step 1
    await page.getByTestId('station-select').selectOption('coco-lagos-1');
    await page.getByTestId('issue-type-input-electrical').check();
    await page.getByTestId('next-button').click();

    // Step 2
    await page.getByTestId('issue-description').fill('E2E test: Pump #2 shows pressure drop intermittently.');
    await page.getByTestId('priority-input-high').check();
    await page.getByTestId('next-button').click();

    // Step 3
    await page.getByTestId('submit-button').click();
    // Accept either toast or success modal to confirm submission
    const toast = page.getByText('Issue submitted successfully!');
    const modal = page.getByRole('heading', { name: 'Issue Submitted Successfully!' });
    await Promise.race([
      toast.waitFor({ state: 'visible', timeout: 20000 }),
      modal.waitFor({ state: 'visible', timeout: 20000 }),
    ]);
  });
});
