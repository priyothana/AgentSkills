'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { renderCartSummary } = require('../src/cart-summary');

test('renders the English summary', () => {
  const html = renderCartSummary({ items: [{ name: 'Mug', quantity: 2, priceCents: 1250 }], currency: 'USD' });
  assert.match(html, /Your cart has 2 items/);
  assert.match(html, /Checkout/);
});
