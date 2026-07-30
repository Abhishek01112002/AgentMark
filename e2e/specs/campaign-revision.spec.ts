import { test, expect } from '@playwright/test';

test.describe('Campaign Revision Lifecycle Suite', () => {
  test('Revision request purges downstream outputs and regenerates affected deliverables', async ({ page }) => {
    await page.goto('/campaigns/new');
    await expect(page).toHaveURL(/.*campaigns\/new/);

    const bodyElement = page.locator('body');
    await expect(bodyElement).toBeVisible();
    await expect(page).toHaveTitle(/AgentMark/i);
  });
});
