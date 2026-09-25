const repo = require('../repositories/projectRepository');

async function list(orgId) {
  return repo.findAll(orgId);
}

async function get(orgId, id) {
  return repo.findById(orgId, id);
}

module.exports = { list, get };
