'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createSearchResults } = require('../src/search-box');
const { createCatalogEvents } = require('../src/catalog-events');

const tick = () => new Promise((r) => setImmediate(r));

test('shows results for the query', async () => {
  const deps = {
    search: async (q) => [{ id: 1, name: `${q} mug` }],
    catalogEvents: createCatalogEvents(),
  };
  const c = createSearchResults({ query: 'blue' }, deps);
  c.mount();
  await tick();
  assert.match(c.ctx.html, /blue mug/);
});
