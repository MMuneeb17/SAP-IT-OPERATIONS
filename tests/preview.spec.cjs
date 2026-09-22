const { test, expect } = require('@playwright/test');

test('local OData V4 metadata and fixture are served', async ({ request }) => {
  const metadata = await request.get('/odata/v4/it-operations/$metadata');
  expect(metadata.ok()).toBeTruthy();
  expect(await metadata.text()).toContain('Namespace="ITOperations"');
  const response = await request.get('/odata/v4/it-operations/Tickets?$count=true');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.value).toHaveLength(1);
  expect(body.value[0].TicketNumber).toBe('SETUP-001');
  const filtered = await request.get("/odata/v4/it-operations/Tickets?$filter=TicketNumber%20eq%20'NONEXISTENT'");
  expect((await filtered.json()).value).toEqual([]);
});

test('generated Fiori list and object page render without a backend', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/test/flp.html#app-preview');
  await expect(page.getByRole('button', { name: 'Go', exact: true })).toBeVisible({ timeout: 90000 });
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(page.getByText('Local preview verification', { exact: true })).toBeVisible({ timeout: 30000 });
  await page.getByText('Local preview verification', { exact: true }).click();
  await expect(page).toHaveURL(/Tickets\(/);
  await expect(page.getByText('Overview', {exact:true}).first()).toBeVisible();
  await page.screenshot({path: 'test-results/help-desk-object-page.png', fullPage:true});
  expect(errors).toEqual([]);
});
