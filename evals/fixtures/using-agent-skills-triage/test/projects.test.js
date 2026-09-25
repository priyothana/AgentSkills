const test = require('node:test');
const assert = require('node:assert');
const { ROLE_PERMISSIONS } = require('../src/auth/permissions');

test('viewers can only read projects', () => {
  assert.deepStrictEqual(ROLE_PERMISSIONS.viewer, ['project:read']);
});
