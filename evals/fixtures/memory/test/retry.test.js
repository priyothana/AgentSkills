'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { withRetry } = require('../src/payments/retry.js');

test('retries until the charge succeeds', async () => {
  let calls = 0;
  const delays = [];
  const result = await withRetry(async () => {
    if (++calls < 3) throw new Error('timeout');
    return 'ok';
  }, async (ms) => delays.push(ms));
  assert.equal(result, 'ok');
  assert.deepEqual(delays, [200, 400]);
});
