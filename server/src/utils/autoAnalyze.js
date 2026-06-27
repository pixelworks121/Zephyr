const prisma = require('./prismaClient');
const { enrichLeadContact } = require('./enrichContact');

// The ai-engine package is ESM ("type":"module") while this server is CommonJS,
// so it must be loaded via dynamic import() rather than require().
let aiEnginePromise = null;
function loadAiEngine() {
  if (!aiEnginePromise) {
    aiEnginePromise = import('@zephyr/ai-engine');
  }
  return aiEnginePromise;
}

// In-memory queue to prevent running too many analyses at once.
// Resets on server restart — acceptable for now.
const analysisQueue = [];
let isProcessing = false;

// Get first admin user ID for system-generated activities.
const getSystemUserId = async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  return admin ? admin.id : null;
};

const processQueue = async () => {
  // Don't run if AI is not configured — clear the queue and bail gracefully.
  if (!process.env.AI_1_API_KEY) {
    console.warn('[AutoAnalyze] AI_1_API_KEY not set — auto analysis disabled');
    analysisQueue.length = 0;
    return;
  }

  if (isProcessing || analysisQueue.length === 0) return;
  isProcessing = true;

  try {
    const { runLeadPipeline } = await loadAiEngine();

    while (analysisQueue.length > 0) {
      const leadId = analysisQueue.shift();

      try {
        console.log(`[AutoAnalyze] Analyzing lead: ${leadId}`);

        // Fetch fresh lead from DB.
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });

        if (!lead) {
          console.warn(`[AutoAnalyze] Lead ${leadId} not found — skipping`);
          continue;
        }

        // Skip if already analyzed.
        if (lead.aiScore !== null && lead.aiScore !== undefined) {
          console.log(`[AutoAnalyze] Lead ${leadId} already analyzed — skipping`);
          continue;
        }

        // Run the AI pipeline.
        const result = await runLeadPipeline(lead, {
          skipReview: false,
          skipPitch: false,
        });

        if (result.success) {
          await prisma.lead.update({
            where: { id: leadId },
            data: {
              aiScore: result.finalScore,
              aiAnalysis: result.analysis,
              whyGoodProspect: result.whyGoodProspect,
              recommendedServices: result.recommendedServices,
              emailTemplate: result.emailTemplate,
              callScript: result.callScript,
            },
          });

          // Log an activity (Activity.userId is required — skip if no user available).
          const userId = lead.assignedToId || (await getSystemUserId());
          if (userId) {
            await prisma.activity.create({
              data: {
                leadId,
                userId,
                type: 'NOTE',
                content: `AI analysis completed automatically — Score: ${result.finalScore}/10, Recommendation: ${result.recommendation}`,
              },
            });
          }

          console.log(`[AutoAnalyze] ✅ Lead ${leadId} analyzed — Score: ${result.finalScore}/10`);
        } else {
          console.error(`[AutoAnalyze] ❌ Lead ${leadId} analysis failed:`, JSON.stringify(result.errors));
        }

        // Find & store contact details so employees can actually reach the lead.
        // Runs regardless of AI success; never throws.
        try {
          const enriched = await enrichLeadContact(leadId);
          if (enriched && enriched.filled.length) {
            console.log(`[AutoAnalyze] 📇 Lead ${leadId} contact enriched (${enriched.found.source}): ${enriched.filled.join(', ')}`);
            const userId = lead.assignedToId || (await getSystemUserId());
            if (userId) {
              await prisma.activity.create({
                data: {
                  leadId,
                  userId,
                  type: 'NOTE',
                  content: `Contact details found automatically (${enriched.found.source}): ${enriched.filled.join(', ')}`,
                },
              });
            }
          }
        } catch (e) {
          console.error(`[AutoAnalyze] Contact enrichment error for ${leadId}:`, e.message);
        }

        // Wait 3 seconds between analyses to respect API rate limits.
        await new Promise((r) => setTimeout(r, 3000));
      } catch (error) {
        console.error(`[AutoAnalyze] Error processing lead ${leadId}:`, error.message);
      }
    }
  } catch (error) {
    // e.g. ai-engine failed to load — never crash the server.
    console.error('[AutoAnalyze] Fatal queue error:', error.message);
  } finally {
    isProcessing = false;
  }
};

// Add a single lead to the analysis queue.
const queueLeadForAnalysis = (leadId) => {
  if (!leadId) return;
  if (analysisQueue.includes(leadId)) return; // prevent duplicates

  analysisQueue.push(leadId);
  console.log(`[AutoAnalyze] Queued lead ${leadId} — queue size: ${analysisQueue.length}`);

  // Process in background — never await, never block the API response.
  setImmediate(() => processQueue());
};

// Add multiple leads to the queue at once (bulk import + pipeline discovery).
const queueMultipleLeadsForAnalysis = (leadIds = []) => {
  if (!Array.isArray(leadIds) || leadIds.length === 0) return;

  const newIds = leadIds.filter((id) => id && !analysisQueue.includes(id));
  if (newIds.length === 0) return;

  analysisQueue.push(...newIds);
  console.log(`[AutoAnalyze] Queued ${newIds.length} leads — total queue: ${analysisQueue.length}`);

  setImmediate(() => processQueue());
};

// Get current queue status.
const getQueueStatus = () => ({
  queued: analysisQueue.length,
  isProcessing,
  queuedIds: [...analysisQueue],
});

module.exports = {
  queueLeadForAnalysis,
  queueMultipleLeadsForAnalysis,
  getQueueStatus,
};
