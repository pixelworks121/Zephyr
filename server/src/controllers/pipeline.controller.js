const prisma = require('../utils/prismaClient');
const apiResponse = require('../utils/apiResponse');
const { getStartOfDay, getStartOfWeek } = require('../utils/dateHelpers');
const { queueMultipleLeadsForAnalysis } = require('../utils/autoAnalyze');

let pipelineStatus = {
  isRunning: false,
  lastRun: null,
  lastResult: null,
};

// Lazy-load the ESM scraper package from this CJS server.
let scraperPromise = null;
function loadScraper() {
  if (!scraperPromise) scraperPromise = import('@zephyr/scraper');
  return scraperPromise;
}

const pipelineController = {
  async triggerRun(req, res, next) {
    try {
      if (pipelineStatus.isRunning) {
        return apiResponse.error(res, 'Pipeline is already running', 409);
      }

      pipelineStatus.isRunning = true;
      const startedAt = new Date();

      // Run in background — respond immediately.
      (async () => {
        try {
          const { runDiscoveryPipeline } = await loadScraper();
          const result = await runDiscoveryPipeline({
            sources: ['google', 'maps', 'producthunt'],
            enrichPublic: true,
            enrichPaidApis: false,
            maxLeads: 50,
            prisma,
          });
          pipelineStatus.lastResult = result.summary;

          // Auto-queue freshly discovered leads (saved during this run, not yet
          // analyzed) for background AI analysis. Done here in the server process
          // so it shares the same queue singleton as the controllers.
          const discovered = await prisma.lead.findMany({
            where: {
              source: 'AI_DISCOVERED',
              aiScore: null,
              createdAt: { gte: startedAt },
            },
            select: { id: true },
          });
          if (discovered.length > 0) {
            queueMultipleLeadsForAnalysis(discovered.map((l) => l.id));
            console.log(`[PipelineController] Queued ${discovered.length} discovered leads for auto AI analysis`);
          }
        } catch (err) {
          console.error('[PipelineController] Error:', err.message);
        } finally {
          pipelineStatus.isRunning = false;
          pipelineStatus.lastRun = new Date();
        }
      })();

      return apiResponse.success(res, {
        message: 'Discovery pipeline started',
        startedAt,
        estimatedDuration: '2-5 minutes',
      });
    } catch (err) {
      pipelineStatus.isRunning = false;
      next(err);
    }
  },

  async getStatus(req, res, next) {
    try {
      const now = new Date();
      const [leadsToday, leadsThisWeek] = await Promise.all([
        prisma.lead.count({ where: { createdAt: { gte: getStartOfDay(now) }, source: 'AI_DISCOVERED' } }),
        prisma.lead.count({ where: { createdAt: { gte: getStartOfWeek(now) }, source: 'AI_DISCOVERED' } }),
      ]);

      return apiResponse.success(res, {
        isRunning: pipelineStatus.isRunning,
        lastRun: pipelineStatus.lastRun,
        lastResult: pipelineStatus.lastResult,
        leadsToday,
        leadsThisWeek,
      });
    } catch (err) {
      next(err);
    }
  },

  async getUsage(req, res, next) {
    try {
      const { getHunterUsage, getApolloUsage } = await loadScraper();
      return apiResponse.success(res, {
        hunter: getHunterUsage(),
        apollo: getApolloUsage(),
        googleSearch: { dailyLimit: 100, note: 'Resets at midnight PST' },
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = pipelineController;
