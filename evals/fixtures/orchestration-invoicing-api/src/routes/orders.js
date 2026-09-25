const express = require('express');
const { pool } = require('../db');
const { sendMail } = require('../lib/mailer');

const router = express.Router();

// Grew organically: validation, pricing, SQL, and email all live in the handler.
router.post('/', async (req, res) => {
  const { customerId, items } = req.body || {};
  if (!Number.isInteger(customerId)) return res.status(400).json({ error: 'customerId is required' });
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items are required' });
  for (const item of items) {
    if (!Number.isInteger(item.productId) || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      return res.status(400).json({ error: 'each item needs productId and a positive quantity' });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [customer] } = await client.query('SELECT id, email FROM customers WHERE id = $1', [customerId]);
    if (!customer) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'customer not found' });
    }
    let totalCents = 0;
    for (const item of items) {
      const { rows: [product] } = await client.query('SELECT price_cents FROM products WHERE id = $1', [item.productId]);
      if (!product) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `unknown product ${item.productId}` });
      }
      totalCents += product.price_cents * item.quantity;
    }
    const { rows: [order] } = await client.query(
      'INSERT INTO orders (customer_id, total_cents, created_by) VALUES ($1, $2, $3) RETURNING id, total_cents',
      [customerId, totalCents, req.user.id],
    );
    for (const item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)',
        [order.id, item.productId, item.quantity],
      );
    }
    await client.query('COMMIT');
    await sendMail(customer.email, 'Order received', `Your order #${order.id} totals ${(totalCents / 100).toFixed(2)}.`);
    res.status(201).json(order);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'internal error' });
  } finally {
    client.release();
  }
});

module.exports = router;
