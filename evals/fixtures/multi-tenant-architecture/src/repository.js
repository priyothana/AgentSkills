'use strict';

const { currentOrgId } = require('./context');

// Data access for organization-owned tables. Every method scopes to the
// organization in the current context.
function scopedRepository(db, table) {
  const rows = () => db[table].filter((r) => r.orgId === currentOrgId());
  return {
    all: () => rows(),
    where: (predicate) => rows().filter(predicate),
    findById: (id) => rows().find((r) => r.id === id) || null,
    insert: (values) => {
      const row = { ...values, id: db.nextId++, orgId: currentOrgId() };
      db[table].push(row);
      return row;
    },
    update: (id, changes) => {
      const row = rows().find((r) => r.id === id);
      if (!row) return null;
      Object.assign(row, changes, { id: row.id, orgId: row.orgId });
      return row;
    },
  };
}

module.exports = { scopedRepository };
