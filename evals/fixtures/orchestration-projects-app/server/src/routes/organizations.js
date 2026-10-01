const express = require('express');
const organizationService = require('../services/organizationService');

const router = express.Router();

// Public sign-up: creates an organization on the free plan with its first owner.
router.post('/', async (req, res, next) => {
  try {
    res.status(201).json(await organizationService.signUp(req.body));
  } catch (err) { next(err); }
});

module.exports = router;
