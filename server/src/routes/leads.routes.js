const express = require('express');
const leadsController = require('../controllers/leads.controller');
const verifyToken = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

const router = express.Router();

router.use(verifyToken);

router.get('/stats', leadsController.getLeadStats);
router.get('/bulk-import', requireAdmin, leadsController.bulkImportLeads);
router.post('/bulk-import', requireAdmin, leadsController.bulkImportLeads);
router.get('/', leadsController.getAllLeads);
router.get('/:id', leadsController.getLeadById);
router.post('/', leadsController.createLead);
router.put('/:id', leadsController.updateLead);
router.delete('/:id', requireAdmin, leadsController.deleteLead);
router.put('/:id/assign', requireAdmin, leadsController.assignLead);

module.exports = router;
