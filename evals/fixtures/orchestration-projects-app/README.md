# Projects

Project tracker used by many customer organizations.

- `server/` — Express API (`npm run dev -w server`)
- `web/` — React single-page app (`npm run dev -w web`)

Database: PostgreSQL. Apply `server/db/migrations/*.sql` in order, then `npm run seed -w server`.
