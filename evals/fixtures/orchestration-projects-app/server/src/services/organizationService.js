const { pool } = require('../db');

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

async function signUp({ organizationName, email }) {
  if (!organizationName || !email) throw httpError(400, 'organizationName and email are required');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [plan] } = await client.query("SELECT id FROM plans WHERE code = 'free'");
    if (!plan) throw new Error('free plan is missing');
    const { rows: [org] } = await client.query(
      'INSERT INTO organizations (name, plan_id) VALUES ($1, $2) RETURNING id, name',
      [organizationName, plan.id],
    );
    const { rows: [user] } = await client.query(
      'INSERT INTO users (email) VALUES ($1) ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id',
      [email],
    );
    await client.query(
      "INSERT INTO memberships (org_id, user_id, role) VALUES ($1, $2, 'owner')",
      [org.id, user.id],
    );
    await client.query('COMMIT');
    return org;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { signUp };
