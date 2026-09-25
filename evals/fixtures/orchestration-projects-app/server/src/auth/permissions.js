// Permissions are defined in code, not in the database. Roles are stored per
// membership (memberships.role).
const ROLE_PERMISSIONS = {
  owner: ['projects:read', 'projects:write', 'projects:delete', 'members:read', 'members:manage'],
  admin: ['projects:read', 'projects:write', 'projects:delete', 'members:read'],
  member: ['projects:read', 'projects:write'],
};

function can(role, permission) {
  return (ROLE_PERMISSIONS[role] || []).includes(permission);
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!can(req.auth.role, permission)) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

module.exports = { ROLE_PERMISSIONS, can, requirePermission };
