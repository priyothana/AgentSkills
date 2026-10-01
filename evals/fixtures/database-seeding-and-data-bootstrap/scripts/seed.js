'use strict';

const { insert } = require('../src/db');

// Resets the database and loads sample data.
function seed(db) {
  db.plans.length = 0;
  db.users.length = 0;
  db.customers.length = 0;

  insert(db, 'plans', { code: 'free', name: 'Free', priceCents: 0 });
  insert(db, 'plans', { code: 'pro', name: 'Pro', priceCents: 2900 });

  insert(db, 'users', { email: 'admin@example.com', password: 'admin123', role: 'admin' });

  const pro = db.plans.find((p) => p.code === 'pro');
  insert(db, 'customers', { name: 'Initech', planId: 2 });
  insert(db, 'customers', { name: 'Globex', planId: pro.id });
}

module.exports = { seed };

if (require.main === module) {
  const { createDb } = require('../src/db');
  const db = createDb();
  seed(db);
  console.log(`Seeded ${db.plans.length} plans, ${db.users.length} users, ${db.customers.length} customers`);
}
