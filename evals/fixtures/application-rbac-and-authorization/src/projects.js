'use strict';

const { authorize } = require('./permissions');

class NotFoundError extends Error {}

function projectService(db) {
  return {
    getProject(actor, projectId) {
      authorize(actor, 'project:read');
      const project = db.projects.find((p) => p.id === projectId);
      if (!project) throw new NotFoundError('Project not found');
      return project;
    },
    renameProject(actor, projectId, name) {
      authorize(actor, 'project:update');
      const project = db.projects.find((p) => p.id === projectId);
      if (!project) throw new NotFoundError('Project not found');
      project.name = name;
      return project;
    },
  };
}

module.exports = { projectService, NotFoundError };
