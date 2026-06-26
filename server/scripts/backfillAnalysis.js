// One-off backfill: analyze all leads that have no aiScore yet.
// Run from server/ with the AI provider env configured (reads server/.env).
//   node scripts/backfillAnalysis.js
//
// Connects to whatever DATABASE_URL is configured (production Neon by default),
// runs the AI pipeline for each unscored lead, updates the lead, and logs an
// activity. Resilient: failures are logged and skipped, never aborts the run.

const prisma = require('../src/utils/prismaClient');

let aiEnginePromise = null;
function loadAiEngine() {
  if (!aiEnginePromise) aiEnginePromise = import('@zephyr/ai-engine');
  return aiEnginePromise;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getSystemUserId() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  return admin ? admin.id : null;
}

async function main() {
  if (!process.env.AI_1_API_KEY) {
    console.error('AI_1_API_KEY not set — aborting.');
    process.exit(1);
  }

  const { runLeadPipeline } = await loadAiEngine();
  const systemUserId = await getSystemUserId();

  const leads = await prisma.lead.findMany({
    where: { aiScore: null },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`[Backfill] Found ${leads.length} unscored leads`);

  let ok = 0;
  let failed = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const tag = `(${i + 1}/${leads.length}) ${lead.companyName}`;
    try {
      const result = await runLeadPipeline(lead, { skipReview: false, skipPitch: false });

      if (result.success) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            aiScore: result.finalScore,
            aiAnalysis: result.analysis,
            whyGoodProspect: result.whyGoodProspect,
            recommendedServices: result.recommendedServices,
            emailTemplate: result.emailTemplate,
            callScript: result.callScript,
          },
        });

        const userId = lead.assignedToId || systemUserId;
        if (userId) {
          await prisma.activity.create({
            data: {
              leadId: lead.id,
              userId,
              type: 'NOTE',
              content: `AI analysis completed (backfill) — Score: ${result.finalScore}/10, Recommendation: ${result.recommendation}`,
            },
          });
        }

        ok++;
        console.log(`[Backfill] ✅ ${tag} — Score: ${result.finalScore}/10`);
      } else {
        failed++;
        console.error(`[Backfill] ❌ ${tag} — ${JSON.stringify(result.errors)}`);
      }
    } catch (err) {
      failed++;
      console.error(`[Backfill] ❌ ${tag} — ${err.message}`);
    }

    // Respect Groq free-tier rate limits (TPM). Wait between leads.
    await sleep(5000);
  }

  console.log(`\n[Backfill] Done. Success: ${ok}, Failed: ${failed}, Total: ${leads.length}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('[Backfill] Fatal:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
