'use strict';

// Stand-in for the API client. The server enforces permissions on every call.
const projects = new Map([
  [1, { id: 1, name: 'Apollo', roles: { alice: 'admin', bob: 'viewer' } }],
  [2, { id: 2, name: 'Gemini', roles: { bob: 'admin' } }],
]);

function getProject(id) {
  return projects.get(id) || null;
}

function roleIn(project, username) {
  return (project && project.roles[username]) || null;
}

module.exports = { getProject, roleIn };
