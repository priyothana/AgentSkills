const test = require('node:test');
const assert = require('node:assert/strict');

test('rejects a non-positive amount', async () => {
  const { createInvoice } = require('../src/services/invoiceService');
  await assert.rejects(createInvoice(1, { customerId: 1, amountCents: 0 }), /amountCents must be positive/);
});
