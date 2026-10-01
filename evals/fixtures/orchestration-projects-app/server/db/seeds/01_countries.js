// Reference data required in every environment.
const COUNTRIES = [
  ['DE', 'Germany'],
  ['FR', 'France'],
  ['GB', 'United Kingdom'],
  ['US', 'United States'],
];

async function run(db) {
  for (const [code, name] of COUNTRIES) {
    await db.query(
      'INSERT INTO countries (code, name) VALUES ($1, $2) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name',
      [code, name],
    );
  }
}

module.exports = { run };
