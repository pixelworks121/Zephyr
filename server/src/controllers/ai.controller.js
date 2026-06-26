const prisma = require('../utils/prismaClient');
const apiResponse = require('../utils/apiResponse');

// The ai-engine package is ESM ("type":"module") while this server is CommonJS,
// so it must be loaded via dynamic import() rather than require().
let aiEnginePromise = null;
function loadAiEngine() {
  if (!aiEnginePromise) {
    aiEnginePromise = import('@zephyr/ai-engine');
  }
  return aiEnginePromise;
}

// Persist an AI pipeline result onto a lead and log an activity.
async function applyResultToLead(lead, result, userId) {
  const updatedLead = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      aiScore: result.finalScore,
      aiAnalysis: result.analysis,
      whyGoodProspect: result.whyGoodProspect,
      recommendedServices: result.recommendedServices,
      emailTemplate: result.emailTemplate,
      callScript: result.callScript,
    },
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
  });

  await prisma.activity.create({
    data: {
      leadId: lead.id,
      userId,
      type: 'NOTE',
      content: `AI analysis completed — Score: ${result.finalScore}/10, Recommendation: ${result.recommendation}`,
    },
  });

  return updatedLead;
}

const aiController = {
  async analyzeLeadById(req, res, next) {
    try {
      const { id } = req.params;

      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) {
        return apiResponse.error(res, 'Lead not found', 404);
      }

      // Employees may only analyze leads assigned to them.
      if (req.user.role === 'EMPLOYEE' && lead.assignedToId !== req.user.id) {
        return apiResponse.error(res, 'Access denied', 403);
      }

      const { runLeadPipeline } = await loadAiEngine();
      const result = await runLeadPipeline(lead);

      if (!result.success) {
        return apiResponse.error(res, 'AI analysis failed', 502, result.errors);
      }

      const updatedLead = await applyResultToLead(lead, result, req.user.id);

      return apiResponse.success(res, { lead: updatedLead, aiResult: result }, 'AI analysis complete');
    } catch (err) {
      next(err);
    }
  },

  async runDiscussionAnalysis(req, res, next) {
    try {
      const { id } = req.params;

      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) {
        return apiResponse.error(res, 'Lead not found', 404);
      }

      const { runLeadPipeline } = await loadAiEngine();
      const result = await runLeadPipeline(lead, { useDiscussion: true });

      if (!result.success) {
        return apiResponse.error(res, 'AI discussion failed', 502, result.errors);
      }

      const updatedLead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          aiScore: result.finalScore,
          aiAnalysis: JSON.stringify(result.discussionTranscript),
        },
        include: { assignedTo: { select: { id: true, name: true, email: true } } },
      });

      await prisma.activity.create({
        data: {
          leadId: lead.id,
          userId: req.user.id,
          type: 'NOTE',
          content: `Multi-agent discussion completed — Consensus Score: ${result.finalScore}/10`,
        },
      });

      return apiResponse.success(res, { 
        lead: updatedLead, 
        discussion: result.discussionTranscript, 
        agentScores: result.agentScores, 
        finalScore: result.finalScore 
      }, 'AI discussion complete');
    } catch (err) {
      next(err);
    }
  },

  async batchAnalyzeLeads(req, res, next) {
    try {
      const { leadIds } = req.body;

      if (!Array.isArray(leadIds) || leadIds.length === 0) {
        return apiResponse.error(res, 'leadIds array is required', 400);
      }
      if (leadIds.length > 10) {
        return apiResponse.error(res, 'Maximum 10 leads per batch', 400);
      }

      const { runLeadPipeline } = await loadAiEngine();

      let processed = 0;
      let failed = 0;
      const results = [];

      for (let i = 0; i < leadIds.length; i++) {
        const leadId = leadIds[i];
        try {
          const lead = await prisma.lead.findUnique({ where: { id: leadId } });
          if (!lead) {
            failed++;
            results.push({ leadId, success: false, error: 'Lead not found' });
          } else {
            const result = await runLeadPipeline(lead);
            if (result.success) {
              await applyResultToLead(lead, result, req.user.id);
              processed++;
              results.push({
                leadId,
                success: true,
                finalScore: result.finalScore,
                recommendation: result.recommendation,
              });
            } else {
              failed++;
              results.push({ leadId, success: false, error: 'Pipeline failed', errors: result.errors });
            }
          }
        } catch (err) {
          failed++;
          results.push({ leadId, success: false, error: err.message });
        }

        // Respect API rate limits — wait 2s between leads (not after the last one).
        if (i < leadIds.length - 1) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      return apiResponse.success(res, { processed, failed, results }, 'Batch analysis complete');
    } catch (err) {
      next(err);
    }
  },

  async getAIStatus(req, res, next) {
    try {
      const { getAIConfigStatus } = await loadAiEngine();
      const aiConfig = getAIConfigStatus();

      const [leadsWithScore, leadsWithoutScore, avgAgg] = await Promise.all([
        prisma.lead.count({ where: { aiScore: { not: null } } }),
        prisma.lead.count({ where: { aiScore: null } }),
        prisma.lead.aggregate({ _avg: { aiScore: true }, where: { aiScore: { not: null } } }),
      ]);

      const avgScore = avgAgg._avg.aiScore != null
        ? parseFloat(avgAgg._avg.aiScore.toFixed(1))
        : null;

      return apiResponse.success(res, {
        agents: {
          ai1: { ...aiConfig.ai1, role: 'Primary (Analyzer + Scorer + Pitch Generator)' },
          ai2: { ...aiConfig.ai2, role: 'Secondary (Reviewer + Discussion Partner)' },
        },
        features: {
          analysis: aiConfig.ai1.configured,
          scoring: aiConfig.ai1.configured,
          pitchGeneration: aiConfig.ai1.configured,
          reviewerAgent: aiConfig.ai2.configured,
          multiAgentDiscussion: aiConfig.ai1.configured && aiConfig.ai2.configured,
        },
        stats: { leadsWithScore, leadsWithoutScore, avgScore },
      });
    } catch (err) {
      next(err);
    }
  },

  async runDiscussionAnalysis(req, res, next) {
    try {
      const { id } = req.params;

      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) {
        return apiResponse.error(res, 'Lead not found', 404);
      }

      const { runLeadPipeline } = await loadAiEngine();
      const result = await runLeadPipeline(lead, { useDiscussion: true });

      if (!result.success) {
        return apiResponse.error(res, 'Discussion analysis failed', 502, result.errors);
      }

      const updatedLead = await applyResultToLead(lead, result, req.user.id);

      // Log the multi-agent discussion activity
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          userId: req.user.id,
          type: 'NOTE',
          content: `Multi-agent discussion completed — Consensus Score: ${result.finalScore}/10, Recommendation: ${result.recommendation}`,
        },
      });

      return apiResponse.success(res, {
        lead: updatedLead,
        discussion: result.discussionTranscript || [],
        agentScores: result.agentScores || null,
        finalScore: result.finalScore,
        recommendation: result.recommendation,
      }, 'Multi-agent discussion complete');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = aiController;
