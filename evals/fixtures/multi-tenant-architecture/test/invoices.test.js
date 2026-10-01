'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createDb } = require('../src/db');
const { runAsOrganization } = require('../src/context');
const { invoiceService } = require('../src/invoices');

function setup() {
  const db = createDb();
  db.organizations.push({ id: 'org-acme', slug: 'acme', active: true });
  return { db, service: invoiceService(db) };
}

test('creates and lists invoices', () => {
  const { service } = setup();
  runAsOrganization('org-acme', () => {
    service.createInvoice({ customer: 'Initech', amountCents: 5000, dueDate: '2026-01-31' });
    assert.equal(service.listInvoices().length, 1);
  });
});

test('marks an invoice paid', () => {
  const { service } = setup();
  runAsOrganization('org-acme', () => {
    const invoice = service.createInvoice({ customer: 'Initech', amountCents: 5000, dueDate: '2026-01-31' });
    assert.equal(service.markPaid(invoice.id).status, 'paid');
  });
});
