'use strict';

// Role → permissions. Roles are ordered from least to most privileged.
const ROLES = ['viewer', 'editor', 'admin', 'owner'];

const ROLE_PERMISSIONS = {
  viewer: ['project:read'],
  editor: ['project:read', 'project:update'],
  admin: ['project:read', 'project:update', 'member:invite'],
  owner: ['project:read', 'project:update', 'member:invite', 'billing:manage'],
};

class ForbiddenError extends Error {}

function can(actor, permission) {
  return (ROLE_PERMISSIONS[actor.role] || []).includes(permission);
}

function authorize(actor, permission) {
  if (!can(actor, permission)) throw new ForbiddenError(`Missing ${permission}`);
}

module.exports = { ROLES, ROLE_PERMISSIONS, can, authorize, ForbiddenError };
