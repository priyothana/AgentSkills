'use strict';

const { t } = require('./i18n');

// Renders the cart summary as an HTML string.
// cart: { items: [{ name, quantity, priceCents }], currency: 'USD' }
function renderCartSummary(cart, locale = 'en') {
  const count = cart.items.reduce((n, item) => n + item.quantity, 0);
  const totalCents = cart.items.reduce((n, item) => n + item.quantity * item.priceCents, 0);
  const itemsLabel = count === 1 ? 'item' : 'items';
  return [
    '<section class="cart-summary" style="text-align: left; padding-left: 16px">',
    `<p>Your cart has ${count} ${itemsLabel}</p>`,
    `<p>Total: $${(totalCents / 100).toFixed(2)}</p>`,
    `<button aria-label="Go to checkout">${t(locale, 'cart.checkout')}</button>`,
    '</section>',
  ].join('');
}

module.exports = { renderCartSummary };
