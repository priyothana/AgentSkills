'use strict';

const { AsyncLocalStorage } = require('node:async_hooks');

const storage = new AsyncLocalStorage();

function runAsOrganization(orgId, fn) {
  if (!orgId) throw new Error('orgId is required');
  return storage.run(Object.freeze({ orgId }), fn);
}

function currentOrgId() {
  const ctx = storage.getStore();
  if (!ctx) throw new Error('No organization context');
  return ctx.orgId;
}

module.exports = { runAsOrganization, currentOrgId };
