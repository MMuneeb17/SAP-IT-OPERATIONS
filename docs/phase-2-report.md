# Phase 2 — OData contract and mock data report

Completed: 1 October 2026. The fixture snapshot remains fixed in September 2026 so
reads and tests are deterministic. Phase 2 implements the local read contract;
workflow mutations and SAP deployment remain later phases.

## Delivered

| Phase 2 requirement | Implementation |
| --- | --- |
| OData service model | OData V4 EDMX for Employees, Tickets, Assets, TicketComments and TicketHistory; typed UUID keys, string lengths, nullability, UTC audit timestamps and calendar dates. |
| Navigation relationships | 14 navigation properties with explicit entity-set bindings, partners where bidirectional, and referential constraints. Includes requester, technician, asset, comments/history, authors/actors and reverse employee/asset ticket collections. |
| Realistic sample data | 66 synthetic records: 6 employees, 6 assets, 9 tickets, 14 comments, 31 history events. Covers all seven ticket statuses and four priorities, unassigned technicians, asset-free tickets, available/retired equipment and missing warranty information. |
| Stable naming | Preserved phase 0 namespace, service root, public sets and UUID conventions; added a complete field/type/nullability dictionary. |
| RAP mapping | Documented persistence/CDS projection mapping, BO ownership, associations, planned actions and migration acceptance checks. |
| Fiori reads | Existing app consumes the expanded OData V4 service; ticket list/object page presents requester, technician, asset, comments and history. Browser tests read Employees, Assets and Tickets through the actual component model. |

The flagship sample `IT-10452` connects Ayesha Khan, laptop `IT-LAP-00452`, technician
Omar Farooq, SSD diagnosis comments and waiting history. Inventory/repair execution
is not implemented in this phase.

Canonical inputs live in `mock/metadata.xml` and `mock/data/`. `npm run mock:sync`
copies metadata, fixtures and mock contributors into the app. Start/preview scripts
synchronize automatically. `mock:check` prevents tests running against stale copies.
UI presentation annotations are separate from the domain metadata.

## Swarm review and fixes

Three agents independently reviewed complementary areas; the primary agent
integrated their findings and performed final verification. No blocking review
findings remain.

| Reviewer | Scope | Findings and resolution |
| --- | --- | --- |
| Contract/documentation agent | Domain model, navigation/cardinality, audit chronology and RAP migration | No blocking domain issue. Flagged stale phase 1 wording and premature action-signature claims; documentation now distinguishes the completed read contract from planned mutation behavior. |
| Service/test agent | Metadata/fixture validation and live OData query behavior | Found null GUID filtering returned no records incorrectly. Added a supported mock contributor for `eq null`/`ne null`, with regression checks for GUID, text and dates and quoted `'null'`. Found JSON `require()` caching could break reloads; contributors now retain the middleware's native JSON loader. |
| Fiori/browser agent | Actual UI5 model reads, list/object navigation and related data rendering | Identified ambiguous “Name” labels; added Requester, Technician, Author and Actor labels. Updated the browser check to expose responsive table details before checking history reasons. |

No installed dependency files were patched. The null comparison adapter delegates
other comparisons to the installed FE middleware. It is a local compatibility fix,
not RAP business logic.

## Verification

Final `npm test`: **21 tests passed** (18 service/validation tests and 3
service/Fiori checks), 34.1 seconds. No uncaught page errors or failed service
requests in the object-page check.

[Verified Fiori history screenshot](evidence/phase-2-ticket-object-page.png)

- `npm run doctor`: Node 24 LTS, component ID, OData V4 and metadata parity pass.
- `npm run mock:check`: all 12 metadata/fixture/contributor files match.
- `npm run validate:contract`: all 66 records pass type, required-field, length,
  identity, foreign-key, status, resolution and timestamp checks.
- `npm run build`: SAPUI5 build passes, including manifest enhancement and preload.
- Service tests cover all five sets, every seeded key, nonexistent-key 404s,
  projection, filters, sorting, paging/count, all navigation paths, empty/null
  relationships and nested expansion. Negative validator tests reject malformed data.
- Browser tests cover real OData V4 model reads, list/object navigation, related
  employee/asset display, comments and history.

## Run and next step

Preview: http://localhost:8082/test/flp.html#app-preview

```sh
npm run preview
npm test
```

Click **Go**, then open **Laptop not booting after restart**. Use the Comments and
History sections; responsive tables may offer **Show More per Row** for extra fields.

Phase 3 is next: ticket creation and business workflow actions. There is no live SAP
backend, authenticated identity, authorization enforcement, durable storage, draft
contract or optimistic-concurrency guarantee. Capability annotations suppress
mutations in Fiori; direct generic mock mutations are outside the supported contract.
SAPUI5 preview still requires internet resources. The sandbox may emit nonfatal
flexibility-service diagnostics, as recorded in phase 1.

On 1 October 2026, npm audit reports 47 development dependency findings (34 high,
11 moderate, 2 low), and zero production dependency findings. The full development
toolchain is not security-cleared for production use. No commit, push or deployment
was performed in this phase.

## References

- [Service contract and field dictionary](service-contract.md)
- [Planned RAP mapping](../sap-design/services/rap-mapping.md)
- [Mock service maintenance](../mock/README.md)
- [SAP FE mock middleware](https://github.com/SAP/open-ux-odata/tree/main/packages/ui5-middleware-fe-mockserver)
- [SAP UI annotation vocabulary](https://github.com/SAP/odata-vocabularies/blob/main/vocabularies/UI.md)
