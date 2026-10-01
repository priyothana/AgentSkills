'use strict';

const { ConflictError } = require('../errors');

function orderService({ db, orders, stock }) {
  return {
    createOrder({ productId, quantity }) {
      return db.transaction(() => {
        if (stock.available(productId) < quantity) {
          throw new ConflictError('Not enough stock');
        }
        stock.adjust(productId, -quantity);
        return orders.insert({ productId, quantity, status: 'pending' });
      });
    },
  };
}

module.exports = { orderService };
