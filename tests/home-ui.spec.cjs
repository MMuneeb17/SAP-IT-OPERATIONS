const { test, expect } = require('@playwright/test');
test('home launches every module and remains usable on a phone', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/test/flp.html?sap-ui-animationMode=none#app-preview', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible({ timeout: 90000 });
  const modules = ['Help Desk', 'My IT Support', 'Asset Management', 'My Assets', 'Repair Workspace', 'MIS Inventory', 'New Inventory Item', 'Stock Overview', 'Reservations', 'Stock Movements', 'IT Operations Dashboard', 'SLA & Configuration', 'Role Access Design'];
  await expect(page.locator('.sapMGT')).toHaveCount(modules.length);
  await page.screenshot({ path: 'test-results/home-desktop.png' });
  for (const name of modules) {
    await page.getByRole('button', { name: new RegExp('^' + name) }).filter({ has: page.locator('.sapMGTHdrTxt') }).click();
    await expect(page.getByRole('button', { name: 'Home', exact: true })).toBeVisible({ timeout: 30000 });
    if (name === 'Repair Workspace') {
      await page.getByRole('combobox', { name: 'Repair ticket', exact: true }).press('F4');
      await page.getByRole('option', { name: /IT-10452/ }).click();
      await expect(page).toHaveURL(/Repair\?ticket=/);
      await expect(page.getByRole('combobox', { name: 'Repair ticket', exact: true })).toHaveValue(/IT-10452/);
    }
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(async () => { await page.getByRole('heading', { name: 'Home', exact: true }).scrollIntoViewIfNeeded(); }).toPass();
  await page.screenshot({ path: 'test-results/home-mobile.png' });
  await page.locator('.sapMGT').filter({ hasText: 'Manage tickets and support requests' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/Tickets/);
  expect(errors).toEqual([]);
});
