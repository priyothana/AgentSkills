const express = require('express');
const invoiceService = require('../services/invoiceService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try { res.json(await invoiceService.listInvoices()); } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try { res.json(await invoiceService.getInvoice(req.params.id)); } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try { res.status(201).json(await invoiceService.createInvoice(req.user.id, req.body)); } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try { res.json(await invoiceService.updateInvoice(req.params.id, req.body)); } catch (err) { next(err); }
});

router.post('/:id/void', async (req, res, next) => {
  try { res.json(await invoiceService.voidInvoice(req.params.id)); } catch (err) { next(err); }
});

module.exports = router;
