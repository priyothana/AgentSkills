const express = require('express');
const { authenticate } = require('./middleware/auth');
const { resolveOrganization } = require('./middleware/tenant');
const projects = require('./routes/projects');
const members = require('./routes/members');
const organizations = require('./routes/organizations');

const app = express();
app.use(express.json());

// Public routes
app.use('/api/organizations', organizations);

// Everything below runs as a signed-in user inside one organization.
app.use('/api', authenticate, resolveOrganization);
app.use('/api/projects', projects);
app.use('/api/members', members);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? 'internal error' : err.message });
});

if (require.main === module) app.listen(process.env.PORT || 3000);

module.exports = app;
