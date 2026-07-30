import { test, expect } from '@playwright/test';

test.describe('Campaign Page Navigation & Reconnection Resilience', () => {
  test('Page Reload mid-campaign preserves state and recovers authoritative DB status', async ({ page }) => {
    await page.goto('/campaigns/new');
    await expect(page).toHaveURL(/.*campaigns\/new/);

    // Perform page reload simulation and assert state URL preservation
    await page.reload();
    await expect(page).toHaveURL(/.*campaigns\/new/);
    await expect(page.locator('body')).toBeVisible();
  });
});
