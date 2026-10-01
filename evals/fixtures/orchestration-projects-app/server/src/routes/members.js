const express = require('express');
const { requirePermission } = require('../auth/permissions');
const memberService = require('../services/memberService');

const router = express.Router();

// Admin-only: lists the members of the current organization.
router.get('/', requirePermission('members:read'), async (req, res, next) => {
  try {
    res.json(await memberService.listMembers(req.orgId));
  } catch (err) { next(err); }
});

module.exports = router;
