// Every request runs inside exactly one organization, taken from the signed token.
function resolveOrganization(req, res, next) {
  const orgId = req.auth && req.auth.orgId;
  if (!orgId) return res.status(401).json({ error: 'no organization' });
  req.orgId = orgId;
  next();
}

module.exports = { resolveOrganization };
