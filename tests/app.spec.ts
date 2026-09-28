import { test, expect } from '@playwright/test';

test('opens directly into a drop and passes a real Python expression', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'smallest number' })).toBeVisible();
  await expect(page.getByText('PY READY')).toBeVisible({ timeout: 20_000 });

  const editor = page.getByLabel('Python solution editor');
  await expect(editor).toContainText('def solve(nums):');
  await editor.fill('def solve(nums):\n    return min(nums)');
  await page.getByRole('button', { name: /FIRE/ }).click();

  const feedback = page.getByRole('status');
  await expect(feedback.getByText('BLOCK CLEARED')).toBeVisible({ timeout: 10_000 });
  const feedbackMetrics = await feedback.evaluate((element) => {
    const title = element.querySelector('strong');
    return { width: element.getBoundingClientRect().width, titleSize: title ? Number.parseFloat(getComputedStyle(title).fontSize) : 0 };
  });
  expect(feedbackMetrics.width).toBeGreaterThanOrEqual(280);
  expect(feedbackMetrics.width).toBeLessThanOrEqual(432);
  expect(feedbackMetrics.titleSize).toBeGreaterThanOrEqual(15);
  expect(feedbackMetrics.titleSize).toBeLessThanOrEqual(18);
});

test('Vim normal mode and help overlay are keyboard accessible', async ({ page }) => {
  await page.goto('/');
  const editor = page.getByLabel('Python solution editor');
  await editor.click();
  await page.keyboard.press('Escape');
  await expect(page.getByText('NORMAL')).toBeVisible();

  await page.getByRole('button', { name: 'Keyboard help' }).click();
  await expect(page.getByRole('heading', { name: /Hands on keys/ })).toBeVisible();
});

test('Tab and Shift-Tab use four-space Python indentation', async ({ page }) => {
  await page.goto('/');
  const editor = page.getByLabel('Python solution editor');
  await editor.click();
  await page.keyboard.press('Tab');
  expect(await page.locator('.cm-line').nth(1).textContent()).toBe('        return ');
  await page.keyboard.press('Shift+Tab');
  expect(await page.locator('.cm-line').nth(1).textContent()).toBe('    return ');
});

test('a wrong answer stays on the current problem until the learner chooses', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('PY READY')).toBeVisible({ timeout: 20_000 });
  await page.getByLabel('Python solution editor').fill('def solve(nums):\n    return 999');
  await page.getByRole('button', { name: /FIRE/ }).click();

  await expect(page.getByText('Hidden test failed')).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(1_500);
  await expect(page.getByRole('heading', { name: 'smallest number' })).toBeVisible();
  await expect(page.getByRole('button', { name: /next problem/ })).toBeVisible();
});

test('track selection starts a focused loop at its smallest chunk', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Curriculum/ }).click();
  await page.getByRole('button', { name: /Binary Search/ }).click();

  await expect(page.getByRole('heading', { name: 'safe midpoint' })).toBeVisible();
  await expect(page.getByText('TRACK LOOP', { exact: true })).toBeVisible();
  await expect(page.getByText('CHUNK 1 · SETUP')).toBeVisible();
});

test('long examples stack and remain readable on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('leetris-solved-v1', JSON.stringify([
      'floor', 'mirror', 'evens', 'clamp', 'dedupe', 'largest', 'total',
      'last-item', 'squares', 'positives', 'all-positive', 'vowel-count',
    ]));
  });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'paired lists' })).toBeVisible();
  const input = page.getByText('a = [1, 2], b = ["x", "y"]');
  const output = page.getByText('[[1, "x"], [2, "y"]]');
  await expect(input).toBeVisible();
  await expect(output).toBeVisible();
  const inputBox = await input.boundingBox();
  const outputBox = await output.boundingBox();
  expect(inputBox).not.toBeNull();
  expect(outputBox).not.toBeNull();
  expect(outputBox!.y).toBeGreaterThan(inputBox!.y + inputBox!.height);
});
