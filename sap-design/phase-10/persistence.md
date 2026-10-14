# Persistence, types and numbering

## Operational tables

The [dictionary](field-dictionary.md) maps every public property. The generated
[DDL template bundle](tables.ddl.example) gives all 19 operational tables and
their stored columns. Split the bundle into individual ADT objects; do not paste
the whole file as one table. Tables use client + UUID keys. Shortened internal
names such as `ZIT_TKT_COMMENT`, `ZIT_TKT_HISTORY` and `ZIT_ASSET_HIST` supersede
longer initial proposals without changing public entity names.

| Family | Tables |
| --- | --- |
| Tickets | ZIT_TICKET, ZIT_TKT_COMMENT, ZIT_TKT_HISTORY |
| Equipment | ZIT_ASSET, ZIT_ASSET_ASSIGN, ZIT_ASSET_REPAIR, ZIT_ASSET_HIST |
| Catalogue and parts | ZIT_MATERIAL, ZIT_STOCK, ZIT_RESERVATION, ZIT_STOCK_TXN |
| Configuration | ZIT_SLA_POLICY, ZIT_CATEGORY, ZIT_SUBCATEGORY, ZIT_TEAM, ZIT_LOCATION, ZIT_WAIT_REASON, ZIT_ESC_RULE |
| Configuration audit | ZIT_CONFIG_HIST |

The client key is internal and never a substitute for record-level authorization.
All joins, unique indexes and lock keys must include the client. Public technical
keys are server-generated UUIDs; imports preserve existing UUIDs and references.
Read-only and immutable children cannot be deleted through composition cascades.

## Constraints and access indexes

| Table(s) | Required invariant / index design |
| --- | --- |
| Ticket | Unique TicketNumber; index requester, technician, team and status with CreatedAt as appropriate to measured queries |
| Asset | Unique AssetTag and company/main-number/subnumber when allocated; index MaterialUUID and CurrentEmployeeUUID; validate duplicate nonblank serials within the agreed asset scope |
| Material | Unique normalized MaterialNumber; immutable tracking mode/unit after usage |
| Stock | Unique MaterialUUID + StorageLocation; physical >= reserved >= 0 |
| Assignment | AssetUUID + StartAt access path; at most one open interval per asset; EndAt is exclusive |
| Repair | AssetUUID/status and TicketUUID access paths; at most one open repair per asset |
| Reservation | StockUUID/status and TicketUUID/AssetRepairUUID access paths; issued <= quantity; cancelled remainder released exactly once |
| Transaction | StockUUID/CreatedAt and OriginalTransactionUUID access paths; paired TransferUUID; append-only signed deltas |
| Configuration | Unique policy priority, category name, location name, waiting code and escalation trigger/level; reference validations |
| Audit/history | Parent UUID + CreatedAt access paths; generated immutable event UUIDs |

Check uniqueness under locks and enforce a database unique index where supported.
An ordinary unique index on an end timestamp does not guarantee one open interval:
validate open assignments/repairs under the asset root lock. Seed duplicate scans
and concurrent tests are mandatory. No performance promise is made without query
plans and production-sized data.

## Type and null rules

- Guid: RAW(16) internally, canonical Edm.Guid externally; never use a displayed
  ticket number, asset tag or employee email as a relationship key.
- Decimal: fixed precision/scale **15,3**, with matching unit. Do not use binary
  floating point. EA quantities must be integers. Check overflow before staging
  any related stock or audit writes.
- Date: calendar date; DateTimeOffset: UTC instant. The current public timestamp
  precision is zero unless EDMX explicitly states otherwise. Keep a separate
  high-precision `local_changed_at` for concurrency; do not turn second-resolution
  LastChangedAt into an unsafe ETag.
- Strings: preserve MaxLength and reject overflow. Template long strings use
  `abap.string`; target support, storage and query limitations must be checked.
  No MaxLength in an action parameter is not permission to bypass the business
  limits in the mock validators (for example, mandatory reasons and descriptions).
- Booleans: internal flags must expose Edm.Boolean, not the strings X/blank.
- Nullable stored values have a `has_*` presence column. This distinguishes an
  absent value from an initial date, zero UUID or empty text during migration.
  Presence columns are internal. CDS/service mapping must emit actual JSON null
  and null associations. A plain rename of an ABAP initial value does **not**
  prove null compatibility. Test generated payloads; use the compatibility mapping
  described in service-migration.md if native projection cannot preserve nulls.

Can*, criticality, live SLA status/deadlines/evaluation time, stock availability,
low-stock flags, reservation remainder and equipment counts are derived, not
independently editable balances. Physical/reserved quantities are stored balances
with immutable deltas and reconciliation. SLA targets and accumulated pause time
are stored snapshots; calculated current deadlines are not a replacement for them.

## Internal support records

These are not public entity sets and do not appear in the 19-table bundle:

| Record | Keys and fields | Purpose |
| --- | --- | --- |
| ZIT_EMP_MAP | client + source_system + source_person_key; unique EmployeeUUID; authenticated principal mapping, validity dates | Stable identity bridge to a released employee source; no editable HR attributes |
| ZIT_NUM_SCOPE | client + company_code + asset_class; number-range object/subobject/interval, active flag, approved format | Approved allocation configuration; no application-maintained MAX+1 counter |
| ZIT_IDEM | client + authenticated principal + operation + request_id; payload hash, result UUID(s), completion timestamp | Optional production retry contract extension; store with successful transaction, reject key reuse with a different payload |

Provision support records using controlled administration. Do not copy local
demo actors or browser employee selectors into authentication. Record mapping
failures as denied operations, not fallback supervisor access.

## Number allocation and shared equipment

Use managed UUID generation where available. TicketNumber and equipment business
numbers use an approved SAP number-range facility through an API released for the
target environment. Reserve unique numbers under the allocator's concurrency
contract; gaps after rollback are acceptable, duplicate/reused issued numbers are
not. Never use `MAX + 1` or parse AssetTag to find the next number in production.

The mock company/class intervals and formatted tag are demo policy, **not a
universal SAP SOP**. Agree the organization-specific format before enabling real
receipts. Operational AssetUUID stays stable if the display tag changes under an
approved migration. Preserve legacy tags and mark allocation provenance.

An EQUIPMENT receipt creates one Asset per unit under its Material, with serials,
location and receipt history; it creates no parallel quantity stock. QUANTITY
items create/update parts stock and an opening movement, never an Asset. New
equipment is available only after successful atomic receipt. FI-AA master number
assignment, acquisition values and accounting documents require a separate
approved integration; these operational fields do not prove an FI-AA posting.
