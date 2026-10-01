const { query } = require('../db');

async function findAll(orgId) {
  return query(
    `SELECT u.id, u.email, m.role
       FROM memberships m JOIN users u ON u.id = m.user_id
      WHERE m.org_id = $1
      ORDER BY u.email`,
    [orgId],
  );
}

module.exports = { findAll };
