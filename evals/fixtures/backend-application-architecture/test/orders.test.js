'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createApp } = require('../src/app');

function appWithStock(productId, qty) {
  const app = createApp();
  app.db.data.stock.set(productId, qty);
  return app;
}

test('creates an order and reserves stock', () => {
  const app = appWithStock('sku-1', 5);
  const res = app.handle({ method: 'POST', path: '/orders', body: { productId: 'sku-1', quantity: 2 } });
  assert.equal(res.status, 201);
  assert.equal(res.body.status, 'pending');
  assert.equal(app.db.data.stock.get('sku-1'), 3);
});

test('rejects an order larger than stock', () => {
  const app = appWithStock('sku-1', 1);
  const res = app.handle({ method: 'POST', path: '/orders', body: { productId: 'sku-1', quantity: 2 } });
  assert.equal(res.status, 409);
});

test('rejects invalid input', () => {
  const app = appWithStock('sku-1', 1);
  const res = app.handle({ method: 'POST', path: '/orders', body: { productId: 'sku-1', quantity: 0 } });
  assert.equal(res.status, 422);
});
