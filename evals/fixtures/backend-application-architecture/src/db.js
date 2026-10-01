'use strict';

// In-memory database used in development and tests.
function createDb() {
  const data = { orders: [], stock: new Map(), nextId: 1 };
  return {
    data,
    // Runs fn atomically: if it throws, all changes made inside are undone.
    transaction(fn) {
      const snapshot = {
        orders: data.orders.map((o) => ({ ...o })),
        stock: new Map(data.stock),
        nextId: data.nextId,
      };
      try {
        return fn();
      } catch (err) {
        data.orders = snapshot.orders;
        data.stock = snapshot.stock;
        data.nextId = snapshot.nextId;
        throw err;
      }
    },
  };
}

module.exports = { createDb };
