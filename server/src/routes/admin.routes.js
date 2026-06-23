const express = require('express');
const adminController = require('../controllers/admin.controller');
const verifyToken = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

const router = express.Router();

// All admin routes require a valid token and ADMIN role.
router.use(verifyToken);
router.use(requireAdmin);

router.get('/overview', adminController.getOverviewStats);
router.get('/reports/daily', adminController.getDailyReport);
router.get('/reports/weekly', adminController.getWeeklyReport);
router.get('/reports/monthly', adminController.getMonthlyReport);
router.get('/reports/pipeline', adminController.getPipelineReport);
router.get('/reports/followups', adminController.getFollowUpReport);
router.get('/team', adminController.getTeamPerformance);
router.get('/sources', adminController.getLeadSourceAnalytics);
router.get('/activity/recent', adminController.getRecentActivity);

module.exports = router;
