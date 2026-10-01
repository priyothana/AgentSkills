// Demo organization for local development only.
async function run(db) {
  const { rows: [plan] } = await db.query("SELECT id FROM plans WHERE code = 'free'");
  if (!plan) return;
  await db.query(
    `INSERT INTO organizations (id, name, plan_id) VALUES (1, 'Demo Org', $1)
     ON CONFLICT (id) DO NOTHING`,
    [plan.id],
  );
}

module.exports = { run, environments: ['development'] };
