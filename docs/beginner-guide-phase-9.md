# Phase 9 — Beginner dashboard guide

## Use the dashboard

1. In the project folder run `npm run preview`, or reuse the server on port 8082.
   Open `http://localhost:8082/test/flp.html#app-preview`.
2. Select the **IT Operations Dashboard** tile on Home. You can also open
   `http://localhost:8082/test/flp.html#app-preview&/Dashboard` directly.
3. Read **Loaded at**. This timestamp tells you when the last successful refresh
   completed. It is not a continuously ticking live feed.
4. Read **Open tickets**, **Critical tickets** and **SLA breaches**. These describe
   the current workload. Select **Open tickets** to see the seven seeded open
   tickets; the count will change when you create or close tickets.
5. Select a ticket number in the supporting records. Its normal Help Desk object
   page opens. Select **Home**, then **IT Operations Dashboard**, to return.
6. Change **Analysis period** from 90 to 30 or 365 days. Averages, incident
   frequency and movements change with this period. Current counts do not.
7. Select **Average response time**. Each supporting row shows the elapsed
   minutes for one sampled ticket. Averages ignore tickets with no first response.
   **No samples** means there is nothing eligible to average.
8. Inspect **Ticket trends**. Select a Created or Resolved count to see its
   underlying tickets. The bars compare interval counts, not past backlog levels.
9. Select **Warranty expiring** or **Assets under repair**, then select an asset
   tag. You are opening the same equipment used in Asset Management and inventory.
10. Select **Low / out-of-stock locations**. A location is low when its available
    quantity is at or below its reorder level. Select the material link to open
    that specific stock location.
11. Inspect **Inventory consumption**. Each material has separate issued,
    returned and net quantities with its unit. Select the material to inspect
    movements, then select a movement record to open its detail page.
12. Perform a ticket or inventory action in another page, return and choose
    **Refresh**. If loading fails, the dashboard hides partial results; retry
    Refresh once the service is available.

Seed records are from September 2026. Period results naturally change as the
current date moves forward; use 365 days to include older examples. The dashboard
does not reset or rewrite seed dates to make charts appear populated.

## Reproduce it manually

1. Start from the completed inventory checkpoint `0bf79f8` in a separate working
   copy. Run `npm ci`, then start the preview on an unused port if the existing
   workspace already uses 8082. Tests are configured for 8082.
2. Read [metric definitions](analytics-workflow.md). Decide the grain and date
   rule of every metric before writing the UI. For example, low stock counts
   material/location records, whereas high incidents counts distinct assets.
3. Create a pure calculation module like
   `apps/help-desk/webapp/ext/analytics/metrics.js`. Pass source records, an
   evaluation timestamp and a period; return values plus contributing records.
   Keep navigation keys beside the displayed record labels.
4. Load Tickets, Assets, Materials, Stocks and StockTransactions using the
   manifest's OData V4 model. Read pages of 100 until exhausted. Publish the new
   snapshot only after all five collections succeed.
5. Add a Fiori custom page controller and XML view. Bind indicators, trend bars,
   consumption rows and supporting records to a named JSON model. Use responsive
   table pop-ins and text counts beside bars.
6. Add Dashboard to `manifest.json`, add a navigation handler and add buttons to
   Home and the existing list pages. Link detail rows to the existing object-page routes.
7. Add the IT Manager page to `model/access-policy.json`. This records design
   intent; actual permissions must be applied by the future backend.
8. Test boundaries with fixed dates and synthetic data. Verify missing samples,
   completed versus open cycles, pauses, warranty endpoints, zero stock, returns,
   mixed units and adjacent time buckets. The provided
   `tests/analytics.spec.cjs` shows these cases.
9. Run `npx playwright test tests/analytics.spec.cjs tests/analytics-ui.spec.cjs`
   for focused checks, then `npm test`, `npm run build` and `npm run doctor`.
   Inspect desktop and mobile screenshots, not just the test result.
10. For the SAP migration, use the
    [CDS analytical design](../sap-design/analytics/README.md). Move aggregation to
    authorized backend views without changing the definitions users learned here.
