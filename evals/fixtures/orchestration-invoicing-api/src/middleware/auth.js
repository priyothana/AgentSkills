const jwt = require('jsonwebtoken');
const { query } = require('../db');

// Loads the signed-in user. users.role is 'admin' or 'member' but nothing
// checks it yet: every signed-in user can call every endpoint.
async function authenticate(req, res, next) {
  const token = (req.get('authorization') || '').replace(/^Bearer /, '');
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'unauthenticated' });
  }
  const [user] = await query('SELECT id, email, role FROM users WHERE id = $1', [payload.sub]);
  if (!user) return res.status(401).json({ error: 'unauthenticated' });
  req.user = user;
  next();
}

module.exports = { authenticate };
