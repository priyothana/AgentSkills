# Invoicing service

Backend for the invoicing product. Organizations sign up, invite users, and issue invoices to their customers.

- `src/db.js` holds the in-memory tables used in development and tests.
- `src/context.js`, `src/resolve-tenant.js`, and `src/repository.js` handle request context and data access.
- `src/invoices.js` is the invoice service.
- `src/cache.js` is a small process-wide cache.

Run the tests with `npm test`.
