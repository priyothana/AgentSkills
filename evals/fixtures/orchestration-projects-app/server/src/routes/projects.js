const express = require('express');
const { requirePermission } = require('../auth/permissions');
const projectService = require('../services/projectService');

const router = express.Router();

router.get('/', requirePermission('projects:read'), async (req, res, next) => {
  try {
    res.json(await projectService.listProjects(req.orgId));
  } catch (err) { next(err); }
});

router.get('/:id', requirePermission('projects:read'), async (req, res, next) => {
  try {
    res.json(await projectService.getProject(req.orgId, req.params.id));
  } catch (err) { next(err); }
});

router.post('/', requirePermission('projects:write'), async (req, res, next) => {
  try {
    res.status(201).json(await projectService.createProject(req.orgId, req.auth.userId, req.body));
  } catch (err) { next(err); }
});

router.delete('/:id', requirePermission('projects:delete'), async (req, res, next) => {
  try {
    await projectService.deleteProject(req.orgId, req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
