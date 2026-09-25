// Runs every seed file in order. Seeds must be idempotent.
const fs = require('fs');
const path = require('path');
const { pool } = require('../../src/db');

async function main() {
  const files = fs.readdirSync(__dirname).filter((f) => /^\d+_.*\.js$/.test(f)).sort();
  for (const file of files) {
    const seed = require(path.join(__dirname, file));
    if (seed.environments && !seed.environments.includes(process.env.NODE_ENV || 'development')) continue;
    console.log(`seeding ${file}`);
    await seed.run(pool);
  }
  await pool.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
