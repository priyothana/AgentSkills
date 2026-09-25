const db = require('../db');

// All queries are scoped by org_id; never query projects without it.
async function findAll(orgId) {
  return db.all('SELECT * FROM projects WHERE org_id = ? AND deleted = 0', [orgId]);
}

async function findById(orgId, id) {
  return db.get('SELECT * FROM projects WHERE org_id = ? AND id = ?', [orgId, id]);
}

module.exports = { findAll, findById };
