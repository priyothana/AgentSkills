const express = require('express');
const { resolveOrganization } = require('./middleware/tenant');
const projects = require('./routes/projects');

const app = express();
app.use(express.json());
app.use(resolveOrganization);
app.use('/projects', projects);

module.exports = app;
