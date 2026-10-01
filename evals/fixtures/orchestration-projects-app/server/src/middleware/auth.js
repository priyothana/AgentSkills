const jwt = require('jsonwebtoken');

// Verifies the session token. The token carries the user, the organization
// the user signed into, and the user's role in that organization.
function authenticate(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.replace(/^Bearer /, '');
  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET); // { userId, orgId, role }
    next();
  } catch {
    res.status(401).json({ error: 'unauthenticated' });
  }
}

module.exports = { authenticate };
