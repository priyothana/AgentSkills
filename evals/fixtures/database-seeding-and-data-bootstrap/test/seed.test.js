'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createDb } = require('../src/db');
const { seed } = require('../scripts/seed');

test('seed loads plans and sample customers', () => {
  const db = createDb();
  seed(db);
  assert.deepEqual(db.plans.map((p) => p.code), ['free', 'pro']);
  assert.equal(db.customers.length, 2);
});
