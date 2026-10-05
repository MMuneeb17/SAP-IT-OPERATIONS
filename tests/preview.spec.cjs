const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');

const service = '/odata/v4/it-operations/';

// Seed-based browser assertions must not depend on the user's preview mutations.
test.beforeEach(async ({ page }) => {
  const tenant = `preview-${randomUUID()}`;
  await page.route('**/odata/v4/it-operations/**', route => {
    const url = new URL(route.request().url());
    url.searchParams.set('sap-client', tenant);
    return route.continue({ url: url.toString() });
  });
});

test('local OData V4 metadata and realistic fixture are served', async ({ request }) => {
  const metadata = await request.get(`${service}$metadata`);
  expect(metadata.ok()).toBeTruthy();
  expect(await metadata.text()).toContain('Namespace="ITOperations"');
  for (const entity of ['Employees', 'Tickets', 'Assets', 'TicketComments', 'TicketHistory']) {
    const response = await request.get(`${service}${entity}?$count=true`);
    expect(response.ok(), entity).toBeTruthy();
    const body = await response.json();
    expect(body.value.length, entity).toBeGreaterThan(1);
    expect(body['@odata.count'], entity).toBe(body.value.length);
  }
  const filtered = await request.get(`${service}Tickets?$filter=TicketNumber%20eq%20'NONEXISTENT'`);
  expect((await filtered.json()).value).toEqual([]);
});

test('Fiori reads Employees, Assets and Tickets using its OData V4 model', async ({ page }) => {
  await page.goto('/test/flp.html#app-preview');
  await expect(page.getByRole('button', { name: 'Go', exact: true })).toBeVisible({ timeout: 90000 });
  const result = await page.evaluate(async () => {
    const Component = await new Promise(resolve => sap.ui.require(['sap/ui/core/Component'], resolve));
    const component = Object.values(Component.registry.all()).find(candidate => candidate.getManifestEntry('sap.app')?.id === 'itoms.helpdesk');
    if (!component) throw new Error('Help Desk component was not registered');
    const model = component.getModel();
    const entities = {};
    for (const entity of ['Employees', 'Assets', 'Tickets']) {
      const binding = model.bindList(`/${entity}`);
      try {
        const contexts = await binding.requestContexts(0, 100);
        entities[entity] = contexts.map(context => context.getObject());
      } finally {
        binding.destroy();
      }
    }
    return { modelType: model.getMetadata().getName(), entities };
  });
  expect(result.modelType).toBe('sap.ui.model.odata.v4.ODataModel');
  for (const rows of Object.values(result.entities)) expect(rows.length).toBeGreaterThan(1);
  expect(result.entities.Tickets.every(ticket => ticket.TicketUUID && ticket.TicketNumber && ticket.Subject)).toBeTruthy();
  expect(result.entities.Employees.every(employee => employee.EmployeeUUID)).toBeTruthy();
  expect(result.entities.Assets.every(asset => asset.AssetUUID)).toBeTruthy();
});

test('Fiori ticket object page displays related people, asset, comments and history', async ({ page }) => {
  const errors = [];
  const failedServiceRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().includes(service) && response.status() >= 400) failedServiceRequests.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('/test/flp.html#app-preview');
  await expect(page.getByRole('button', { name: 'Go', exact: true })).toBeVisible({ timeout: 90000 });
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  const subject = page.getByText('Laptop not booting after restart', { exact: true });
  await expect(subject).toBeVisible({ timeout: 30000 });
  await subject.click();
  await expect(page).toHaveURL(/Tickets\(/);
  await expect(page.getByText('Overview', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Ayesha Khan', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText('Omar Farooq', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText('IT-LAP-00452', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await page.getByText('Comments', { exact: true }).first().click();
  await expect(page.getByText('SSD failure confirmed; replacement part is pending.', { exact: true })).toBeVisible();
  await page.getByText('History', { exact: true }).first().click();
  const history = page.getByRole('region', { name: 'History', exact: true });
  await expect(history.getByText('PutOnHold', { exact: true })).toBeVisible();
  const showMore = history.getByRole('option', { name: 'Show More per Row', exact: true });
  if (await showMore.isVisible()) await showMore.click();
  // UI5 responsive pop-in cells are owned through ARIA, not DOM descendants of the main row.
  await expect(history.getByRole('row', { name: /PutOnHold.*Waiting for replacement SSD\./ })).toBeVisible();
  await expect(history.getByRole('gridcell', { name: /Reason : Waiting for replacement SSD\./ })).toBeVisible();
  await history.screenshot({ path: 'test-results/phase-2-ticket-object-page.png', animations: 'disabled' });
  expect(failedServiceRequests).toEqual([]);
  expect(errors).toEqual([]);
});
