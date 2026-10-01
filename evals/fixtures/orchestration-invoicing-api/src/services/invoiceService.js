const invoiceRepository = require('../repositories/invoiceRepository');

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

async function listInvoices() {
  return invoiceRepository.findAll();
}

async function getInvoice(id) {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) throw httpError(404, 'invoice not found');
  return invoice;
}

async function createInvoice(userId, { customerId, amountCents }) {
  if (!Number.isInteger(customerId)) throw httpError(400, 'customerId is required');
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw httpError(400, 'amountCents must be positive');
  return invoiceRepository.insert({ customerId, amountCents, createdBy: userId });
}

async function updateInvoice(id, { amountCents }) {
  const invoice = await getInvoice(id);
  if (invoice.status !== 'draft') throw httpError(409, 'only draft invoices can be edited');
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw httpError(400, 'amountCents must be positive');
  return invoiceRepository.updateAmount(id, amountCents);
}

async function voidInvoice(id) {
  const invoice = await getInvoice(id);
  if (invoice.status === 'void') throw httpError(409, 'invoice already void');
  return invoiceRepository.setStatus(id, 'void');
}

module.exports = { listInvoices, getInvoice, createInvoice, updateInvoice, voidInvoice };
