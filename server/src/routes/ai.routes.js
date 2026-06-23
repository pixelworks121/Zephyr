const express = require('express');
const aiController = require('../controllers/ai.controller');
const verifyToken = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

const router = express.Router();

router.use(verifyToken);

router.post('/analyze/:id', aiController.analyzeLeadById);
router.post('/batch-analyze', requireAdmin, aiController.batchAnalyzeLeads);
router.post('/discuss/:id', requireAdmin, aiController.runDiscussionAnalysis);
router.get('/status', aiController.getAIStatus);

module.exports = router;
