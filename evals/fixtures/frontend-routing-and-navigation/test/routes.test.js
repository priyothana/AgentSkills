'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { router } = require('../src/routes');

const alice = { session: { user: { username: 'alice' } } };

test('anonymous users are sent to sign-in with a return path', () => {
  const result = router.resolve('/projects', { session: null });
  assert.deepEqual(result, { status: 302, redirect: '/login?returnTo=%2Fprojects' });
});

test('signed-in users see a project', () => {
  const result = router.resolve('/projects/1', alice);
  assert.equal(result.status, 200);
  assert.equal(result.data.name, 'Apollo');
});

test('unknown paths are not found', () => {
  assert.equal(router.resolve('/nope', alice).status, 404);
});
