'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createDb } = require('../src/db');
const { projectService } = require('../src/projects');
const { ForbiddenError } = require('../src/permissions');

function setup() {
  const db = createDb();
  db.projects.push({ id: 'p1', name: 'Apollo' });
  return { db, projects: projectService(db) };
}

test('editors can rename projects', () => {
  const { projects } = setup();
  assert.equal(projects.renameProject({ userId: 'u1', role: 'editor' }, 'p1', 'Artemis').name, 'Artemis');
});

test('viewers cannot rename projects', () => {
  const { projects } = setup();
  assert.throws(() => projects.renameProject({ userId: 'u2', role: 'viewer' }, 'p1', 'X'), ForbiddenError);
});
