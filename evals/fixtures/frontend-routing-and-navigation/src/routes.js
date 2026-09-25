'use strict';

const { createRouter } = require('./router');
const { requireSignIn } = require('./guards');
const { getProject } = require('./api');

const routes = [
  { path: '/', view: 'home' },
  { path: '/login', view: 'login' },
  { path: '/projects', view: 'project-list', guards: [requireSignIn] },
  {
    path: '/projects/:projectId',
    view: 'project',
    guards: [requireSignIn],
    load: ({ params }) => getProject(Number(params.projectId)) || { notFound: true },
  },
];

const router = createRouter(routes);

module.exports = { router, routes };
