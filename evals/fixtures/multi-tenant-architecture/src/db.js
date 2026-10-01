'use strict';

function createDb() {
  return {
    organizations: [],
    memberships: [],
    invoices: [],
    nextId: 1,
  };
}

module.exports = { createDb };
