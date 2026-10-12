const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
test.use({ actionTimeout: 20000 });
async function setup(page) {
  const tenant = 'catalogue-ui-' + randomUUID();
  await page.route('**/odata/v4/it-operations/**', route => { const u = new URL(route.request().url()); u.searchParams.set('sap-client', tenant); return route.continue({ url: u.toString() }); });
  return tenant;
}
const fill = (page, name, value) => page.getByRole('form').getByRole('textbox', { name, exact: true }).fill(value);
async function common(page, number) {
  await fill(page, 'Material number', number); await fill(page, 'Description', 'Office equipment receipt'); await fill(page, 'Category', 'Computers');
  await fill(page, 'Quantity', '1'); await fill(page, 'Stock location', 'Karachi store'); await fill(page, 'Reason', 'New equipment purchase');
}
test('inventory form creates shared equipment, opens its asset and receives another unit', async ({ page, request }) => {
  const tenant = await setup(page), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/test/flp.html?sap-ui-animationMode=none#app-preview&/Materials', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'New inventory item', exact: true })).toBeVisible({ timeout: 90000 });
  await page.getByRole('button', { name: 'New inventory item', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Material number', exact: true })).toBeVisible();
  await common(page, 'UI-LAPTOP'); await fill(page, 'Manufacturer', 'Dell'); await fill(page, 'Model', 'Browser acceptance laptop');
  await fill(page, 'Serial numbers', 'UI-SERIAL-001');
  await page.getByRole('button', { name: 'Create item', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Asset tag 100000000001', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/inventory-equipment-created.png', animations: 'disabled' });
  await page.getByRole('link', { name: 'Asset tag 100000000001', exact: true }).click();
  await expect(page.getByRole('heading', { name: '100000000001', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View inventory item', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View inventory item', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Receive equipment', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Receive equipment', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Material number', exact: true })).toHaveValue('UI-LAPTOP');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('textbox', { name: 'Material number', exact: true })).toHaveValue('UI-LAPTOP', { timeout: 90000 });
  await fill(page, 'Serial numbers', 'UI-SERIAL-002'); await fill(page, 'Stock location', 'Lahore store'); await fill(page, 'Reason', 'Second receipt');
  await page.getByRole('button', { name: 'Receive equipment', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Asset tag 100000000002', exact: true })).toBeVisible();
  const response = await request.get('/odata/v4/it-operations/Assets?sap-client=' + tenant);
  const assets = (await response.json()).value.filter(a => a.SerialNumber?.startsWith('UI-SERIAL-'));
  expect(assets).toHaveLength(2); expect(assets[0].MaterialUUID).toBe(assets[1].MaterialUUID);
  expect(errors).toEqual([]);
});
test('mobile inventory form creates quantity-tracked parts and keeps errors editable', async ({ page, request }) => {
  const tenant = await setup(page); await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/test/flp.html?sap-ui-animationMode=none#app-preview&/InventoryItem', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('combobox', { name: 'Tracking method', exact: true })).toBeVisible({ timeout: 90000 });
  await page.getByRole('combobox', { name: 'Tracking method', exact: true }).press('F4');
  await page.getByRole('option', { name: 'Parts — stock quantities', exact: true }).click();
  await common(page, 'UI-PART'); await fill(page, 'Quantity', '0');
  await page.getByRole('button', { name: 'Create item', exact: true }).click();
  await expect(page.getByText('Enter a positive quantity; EA requires whole units.', { exact: true })).toBeVisible();
  await fill(page, 'Quantity', '4');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/inventory-item-mobile.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Create item', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View inventory item', exact: true })).toBeVisible();
  const response = await request.get('/odata/v4/it-operations/Materials?$filter=MaterialNumber%20eq%20%27UI-PART%27&$expand=Stocks,Assets&sap-client=' + tenant);
  const material = (await response.json()).value[0]; expect(material.Assets).toHaveLength(0); expect(Number(material.Stocks[0].PhysicalQuantity)).toBe(4);
});
