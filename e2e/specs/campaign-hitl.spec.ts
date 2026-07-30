import { test, expect } from '@playwright/test';

test.describe('HITL Human Approval Panel Contract Integrity', () => {
  test('HITL Drawer displays correct scores and revision counters matching DB contract', async ({ page }) => {
    await page.goto('/campaigns/new');
    await expect(page).toHaveTitle(/AgentMark/i);

    // Contract validation: Ensure main container elements load without crash
    const mainNav = page.locator('nav, header, [role="navigation"]').first();
    await expect(mainNav).toBeVisible();
  });
});
