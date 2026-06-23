const express = require('express');
const activityController = require('../controllers/activity.controller');
const verifyToken = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

const router = express.Router();

router.use(verifyToken);

router.post('/', activityController.createActivity);
router.get('/me', activityController.getMyActivities);
router.get('/lead/:leadId', activityController.getActivitiesByLead);
router.get('/', requireAdmin, activityController.getAllActivities);
router.delete('/:id', activityController.deleteActivity);

module.exports = router;
