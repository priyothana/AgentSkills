'use strict';

const { ValidationError } = require('../errors');

function orderHandlers(service) {
  return {
    create(request) {
      const { productId, quantity } = request.body || {};
      if (typeof productId !== 'string' || !Number.isInteger(quantity) || quantity < 1) {
        throw new ValidationError('Invalid order', { productId: 'string', quantity: 'positive integer' });
      }
      const order = service.createOrder({ productId, quantity });
      return { status: 201, body: order };
    },
  };
}

module.exports = { orderHandlers };
