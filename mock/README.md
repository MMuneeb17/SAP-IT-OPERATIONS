# Local preview service

`metadata.xml` is the canonical phase 1 setup-only OData V4 metadata. SAP's generator
copies it into `apps/help-desk/webapp/localService/mainService/metadata.xml`.
Keep the copies synchronized; `npm run doctor` checks this.

The single synthetic `SETUP-001` ticket proves list reading and object navigation.
It is not realistic help-desk data. Automatic random fixture generation is disabled.
SAP Fiori tools mock middleware provides OData reads, filtering and batch support.
The UI contract advertises no create/update/delete operations in this starter.

Phase 2 will extend the metadata with Employees, Assets, TicketComments,
TicketHistory, relationships and representative datasets. This fixture does not
implement business actions, persistence, authentication, draft or RAP rules.
