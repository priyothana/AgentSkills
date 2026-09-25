'use strict';

const { scopedRepository } = require('./repository');

function invoiceService(db) {
  const invoices = scopedRepository(db, 'invoices');
  return {
    listInvoices: () => invoices.all(),
    createInvoice: ({ customer, amountCents, dueDate }) =>
      invoices.insert({ customer, amountCents, dueDate, status: 'unpaid' }),
    markPaid: (id) => invoices.update(id, { status: 'paid' }),
  };
}

module.exports = { invoiceService };
