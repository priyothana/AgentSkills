'use strict';

const { createDb } = require('./db');
const { toResponse } = require('./errors');
const { orderRepository } = require('./repositories/order-repository');
const { stockRepository } = require('./repositories/stock-repository');
const { orderService } = require('./services/order-service');
const { orderHandlers } = require('./handlers/orders');

// Wires dependencies and exposes a transport-level entry point.
function createApp(db = createDb()) {
  const service = orderService({ db, orders: orderRepository(db), stock: stockRepository(db) });
  const handlers = orderHandlers(service);

  const routes = [
    { method: 'POST', pattern: /^\/orders$/, handler: handlers.create },
  ];

  function handle(request) {
    for (const route of routes) {
      const match = request.method === route.method && request.path.match(route.pattern);
      if (match) {
        try {
          return route.handler({ ...request, params: match.slice(1) });
        } catch (err) {
          return toResponse(err);
        }
      }
    }
    return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'Route not found' } } };
  }

  return { handle, db };
}

module.exports = { createApp };
