# Feature: cancel an order

Add `POST /orders/:id/cancel`.

- Only orders with status `pending` can be cancelled. Cancelling a `shipped` or already `cancelled` order must fail with a clear error.
- Cancelling returns the reserved quantity of the product to stock.
- The response is the updated order.

Add tests.
