'use strict';

// Minimal in-memory database with the same tables as production.
// Unique constraints: plans.code, users.email.
function createDb() {
  return { plans: [], users: [], customers: [], nextId: 1 };
}

function insert(db, table, row) {
  const full = { id: db.nextId++, ...row };
  db[table].push(full);
  return full;
}

module.exports = { createDb, insert };
