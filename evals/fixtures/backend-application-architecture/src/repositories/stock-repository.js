'use strict';

function stockRepository(db) {
  return {
    available: (productId) => db.data.stock.get(productId) || 0,
    adjust: (productId, delta) => {
      db.data.stock.set(productId, (db.data.stock.get(productId) || 0) + delta);
    },
  };
}

module.exports = { stockRepository };
