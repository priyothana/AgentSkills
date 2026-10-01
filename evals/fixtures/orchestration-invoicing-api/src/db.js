const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function query(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

module.exports = { pool, query };
