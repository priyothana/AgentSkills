const projectRepository = require('../repositories/projectRepository');

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

async function listProjects(orgId) {
  return projectRepository.findAll(orgId);
}

async function getProject(orgId, id) {
  const project = await projectRepository.findById(orgId, id);
  if (!project) throw httpError(404, 'project not found');
  return project;
}

async function createProject(orgId, userId, input) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) throw httpError(400, 'name is required');
  return projectRepository.insert(orgId, { name, createdBy: userId });
}

async function deleteProject(orgId, id) {
  const deleted = await projectRepository.remove(orgId, id);
  if (!deleted) throw httpError(404, 'project not found');
}

module.exports = { listProjects, getProject, createProject, deleteProject };
