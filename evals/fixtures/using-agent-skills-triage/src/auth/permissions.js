const ROLE_PERMISSIONS = {
  admin: ['project:read', 'project:create', 'project:update'],
  member: ['project:read', 'project:create'],
  viewer: ['project:read'],
};

function requirePermission(permission) {
  return (req, res, next) => {
    const granted = ROLE_PERMISSIONS[req.auth && req.auth.role] || [];
    if (!granted.includes(permission)) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

module.exports = { ROLE_PERMISSIONS, requirePermission };
