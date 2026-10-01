const { query } = require('../db');

// Every query is scoped to the caller's organization.

async function findAll(orgId) {
  return query('SELECT id, name, created_at FROM projects WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
}

async function findById(orgId, id) {
  const rows = await query('SELECT id, name, created_at FROM projects WHERE org_id = $1 AND id = $2', [orgId, id]);
  return rows[0] || null;
}

async function insert(orgId, { name, createdBy }) {
  const rows = await query(
    'INSERT INTO projects (org_id, name, created_by) VALUES ($1, $2, $3) RETURNING id, name, created_at',
    [orgId, name, createdBy],
  );
  return rows[0];
}

async function remove(orgId, id) {
  const rows = await query('DELETE FROM projects WHERE org_id = $1 AND id = $2 RETURNING id', [orgId, id]);
  return rows.length > 0;
}

module.exports = { findAll, findById, insert, remove };
