const express = require('express');
const { authenticate } = require('./middleware/auth');
const invoices = require('./routes/invoices');
const orders = require('./routes/orders');

const app = express();
app.use(express.json());

app.use('/api', authenticate);
app.use('/api/invoices', invoices);
app.use('/api/orders', orders);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? 'internal error' : err.message });
});

if (require.main === module) app.listen(process.env.PORT || 3000);

module.exports = app;
