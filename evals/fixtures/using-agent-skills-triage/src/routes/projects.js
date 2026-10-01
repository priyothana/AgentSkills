const express = require('express');
const { requirePermission } = require('../auth/permissions');
const projectService = require('../services/projectService');

const router = express.Router();

router.get('/', requirePermission('project:read'), async (req, res) => {
  res.json(await projectService.list(req.orgId));
});

router.get('/:id', requirePermission('project:read'), async (req, res) => {
  const project = await projectService.get(req.orgId, req.params.id);
  if (!project) return res.status(404).json({ error: 'not found' });
  res.json(project);
});

module.exports = router;
