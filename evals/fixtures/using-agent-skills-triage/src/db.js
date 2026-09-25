// Thin wrapper over the production SQL database (SQLite in tests).
// Schema: projects(id, org_id, name, deleted INTEGER DEFAULT 0, created_at)
module.exports = require('./dbDriver');
