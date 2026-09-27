import { test, expect } from '@playwright/test';

test('opens directly into a drop and passes a real Python expression', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'smallest number' })).toBeVisible();
  await expect(page.getByText('PY READY')).toBeVisible({ timeout: 20_000 });

  const editor = page.getByLabel('Python expression');
  await editor.fill('min(nums)');
  await page.getByRole('button', { name: /FIRE/ }).click();

  await expect(page.getByText('BLOCK CLEARED')).toBeVisible({ timeout: 10_000 });
});

test('Vim normal mode and help overlay are keyboard accessible', async ({ page }) => {
  await page.goto('/');
  const editor = page.getByLabel('Python expression');
  await editor.click();
  await page.keyboard.press('Escape');
  await expect(page.getByText('NORMAL')).toBeVisible();

  await page.getByRole('button', { name: 'Keyboard help' }).click();
  await expect(page.getByRole('heading', { name: /Hands on keys/ })).toBeVisible();
});
