const express = require('express');
const pipelineController = require('../controllers/pipeline.controller');
const verifyToken = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

const router = express.Router();

router.use(verifyToken);

router.post('/run', requireAdmin, pipelineController.triggerRun);
router.get('/status', pipelineController.getStatus);
router.get('/usage', requireAdmin, pipelineController.getUsage);

module.exports = router;
