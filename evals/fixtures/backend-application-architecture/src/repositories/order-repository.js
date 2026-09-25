'use strict';

function orderRepository(db) {
  return {
    findById: (id) => db.data.orders.find((o) => o.id === id) || null,
    insert: (order) => {
      const row = { ...order, id: db.data.nextId++ };
      db.data.orders.push(row);
      return { ...row };
    },
    update: (id, changes) => {
      const row = db.data.orders.find((o) => o.id === id);
      if (!row) return null;
      Object.assign(row, changes);
      return { ...row };
    },
  };
}

module.exports = { orderRepository };
