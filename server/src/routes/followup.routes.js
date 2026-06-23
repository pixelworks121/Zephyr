const express = require('express');
const followupController = require('../controllers/followup.controller');
const verifyToken = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

const router = express.Router();

router.use(verifyToken);

router.post('/', followupController.createFollowUp);
router.get('/me', followupController.getMyFollowUps);
router.get('/lead/:leadId', followupController.getFollowUpsByLead);
router.get('/', requireAdmin, followupController.getAllFollowUps);
router.put('/:id', followupController.updateFollowUp);
router.put('/:id/done', followupController.markFollowUpDone);
router.delete('/:id', requireAdmin, followupController.deleteFollowUp);

module.exports = router;
