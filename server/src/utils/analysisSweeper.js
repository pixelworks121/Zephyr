const cron = require('node-cron');
const prisma = require('./prismaClient');
const { queueLeadForAnalysis, queueMultipleLeadsForAnalysis, getQueueStatus } = require('./autoAnalyze');
const { enrichLeadContact } = require('./enrichContact');

let task = null;

// How many leads to feed into the queue per sweep, and the queue ceiling we keep.
const BATCH = 25;
const QUEUE_CEILING = 30;

// One sweep: (1) queue any unanalyzed leads for full AI analysis (which also
// enriches contacts), and (2) for already-analyzed leads still missing an email,
// run a lightweight contact-enrichment pass.
async function sweep() {
  try {
    if (!process.env.AI_1_API_KEY) return;

    const status = getQueueStatus();
    // Don't pile up — only top up the queue when it's getting low.
    if (status.queued < QUEUE_CEILING) {
      const unscored = await prisma.lead.findMany({
        where: { aiScore: null },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
        take: BATCH,
      });
      if (unscored.length) {
        queueMultipleLeadsForAnalysis(unscored.map((l) => l.id));
        console.log(`[Sweeper] Queued ${unscored.length} unanalyzed leads for AI analysis`);
      }
    }

    // Contact-only enrichment for leads that ARE analyzed but still have no email
    // (e.g., analyzed before contact enrichment existed). Small batch to respect
    // Hunter quota and avoid long runs.
    const needContact = await prisma.lead.findMany({
      where: { aiScore: { not: null }, email: null, website: { not: null } },
      select: { id: true },
      take: 5,
    });
    for (const l of needContact) {
      const r = await enrichLeadContact(l.id);
      if (r && r.filled.length) {
        console.log(`[Sweeper] 📇 Lead ${l.id} contact enriched (${r.found.source}): ${r.filled.join(', ')}`);
      }
    }
  } catch (e) {
    console.error('[Sweeper] Error:', e.message);
  }
}

function startAnalysisSweeper() {
  if (!process.env.AI_1_API_KEY) {
    console.warn('[Sweeper] AI_1_API_KEY not set — autonomous sweeper disabled');
    return;
  }
  if (task) return;

  // Run every minute. The queue + per-lead delays naturally throttle throughput.
  task = cron.schedule('* * * * *', sweep);
  console.log('[Sweeper] Autonomous analysis sweeper started (runs every minute)');

  // Kick off an immediate sweep on boot so the backlog starts right away.
  setImmediate(sweep);
}

module.exports = { startAnalysisSweeper, sweep };
