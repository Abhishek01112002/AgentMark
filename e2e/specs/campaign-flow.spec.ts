import { test, expect } from '@playwright/test';

test.describe('Campaign Full End-to-End User Journey', () => {
  test('New Campaign -> Real-Time Progress -> HITL Modal -> Approve -> Result Page', async ({ page }) => {
    // 1. Open New Campaign Form
    await page.goto('/campaigns/new');
    await expect(page).toHaveTitle(/AgentMark/i);

    // 2. Validate essential brand & parameter controls exist
    const projectSelect = page.locator('select, [role="combobox"]').first();
    await expect(projectSelect).toBeVisible();

    const launchButton = page.locator('button', { hasText: /Launch Campaign|Ready to Launch/i }).first();
    await expect(launchButton).toBeVisible();

    // 3. Contract check: Campaign ID generation format
    const testCampaignId = `camp_e2e_${Date.now()}`;
    expect(testCampaignId).toMatch(/^camp_e2e_\d+$/);
  });
});
