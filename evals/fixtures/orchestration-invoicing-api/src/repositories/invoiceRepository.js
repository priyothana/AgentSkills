const { query } = require('../db');

const COLUMNS = 'id, customer_id, amount_cents, status, created_by, created_at';

async function findAll() {
  return query(`SELECT ${COLUMNS} FROM invoices ORDER BY created_at DESC`);
}

async function findById(id) {
  const rows = await query(`SELECT ${COLUMNS} FROM invoices WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function insert({ customerId, amountCents, createdBy }) {
  const rows = await query(
    `INSERT INTO invoices (customer_id, amount_cents, created_by) VALUES ($1, $2, $3) RETURNING ${COLUMNS}`,
    [customerId, amountCents, createdBy],
  );
  return rows[0];
}

async function updateAmount(id, amountCents) {
  const rows = await query(`UPDATE invoices SET amount_cents = $2 WHERE id = $1 RETURNING ${COLUMNS}`, [id, amountCents]);
  return rows[0];
}

async function setStatus(id, status) {
  const rows = await query(`UPDATE invoices SET status = $2 WHERE id = $1 RETURNING ${COLUMNS}`, [id, status]);
  return rows[0];
}

module.exports = { findAll, findById, insert, updateAmount, setStatus };
