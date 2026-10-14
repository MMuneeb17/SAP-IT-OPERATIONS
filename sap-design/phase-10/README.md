# Phase 10 — SAP RAP backend design package

Status: design completed locally, 14 October 2026. No SAP system is connected;
the templates have not been activated, syntax-checked in ADT, or deployed.

This package maps the implemented mock contract to a backend blueprint: **20
entity sets, 243 public fields, 59 navigation properties, 36 bound actions and
standard ticket creation**. It includes the configuration, shared equipment and
analytics added after the original phase plan. It does not add a second local
backend or change the functioning Fiori application.

## Read in this order

1. [Architecture and decisions](architecture.md): ownership, non-draft operation,
   standard SAP integration boundaries and release gates.
2. [Persistence](persistence.md): keys, indexes, nulls, technical timestamps,
   identity and number allocation.
3. [Field dictionary](field-dictionary.md) and [navigation map](navigation-map.md):
   exhaustive public-to-persistence/CDS mapping.
4. [Behavior](behavior.md) and [action map](action-map.md): create, actions,
   validations, determinations and authorization requirements.
5. [Transactions](transactions.md): locks, concurrent stock, rollback and retries.
6. [Service and migration](service-migration.md): CDS projection, generated
   metadata differences, UI annotations, paging, cutover and rollback.
7. [Acceptance](acceptance.md): implementation order and evidence required in SAP.

`blueprint.json` records the reviewed mapping decisions and the public contract
snapshot. The five generated reference artifacts are checked against this file.
The table template bundle contains 19 separate custom operational table designs;
the service template exposes all 20 sets. These `.example` files are implementation
inputs, not production-ready ABAP or claims of release compatibility.

```sh
npm run design:check
npm run design:render   # after deliberately editing blueprint.json
```

Rendering does not silently accept a changed mock contract. Update the snapshot
and affected design decisions deliberately; the validator checks the canonical
EDMX, role policy, ownership, field coverage, decimal facets and generated files.
It cannot prove SAP compiler compatibility, authorization or transactional safety.

For a beginner walkthrough see [the manual guide](../../docs/beginner-guide-phase-10.md).
For scope and verification see [the completion report](../../docs/phase-10-report.md).
