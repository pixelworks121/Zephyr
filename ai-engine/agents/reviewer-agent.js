import { getAI2 } from '../config/aiConfig.js'

export const reviewLead = async (lead, analysis, claudeScore) => {
  const ai2 = getAI2()

  // Graceful fallback if AI 2 is not configured
  if (!ai2) {
    console.warn('[ReviewerAgent] AI 2 not configured — skipping review')
    return {
      success: false,
      reviewData: {
        agreeWithScore: true,
        reviewerScore: claudeScore.score,
        finalScore: claudeScore.score,
        adjustment: 'none',
        adjustmentReason: 'Second AI agent not configured — using primary score only',
        missedOpportunities: [],
        redFlags: [],
        recommendation: claudeScore.score >= 7 ? 'pursue' : claudeScore.score >= 4 ? 'nurture' : 'skip',
        recommendationReason: 'Based on primary AI analysis only'
      },
      error: 'AI_2 not configured'
    }
  }

  try {
    const prompt = `
You are a second-opinion analyst at Pixel Works digital agency.
Another AI analyst has already reviewed this lead. Your job is to independently verify their assessment.

LEAD:
Company: ${lead.companyName}
Industry: ${lead.industry || 'Unknown'}
Country: ${lead.country || 'Unknown'}
Size: ${lead.businessSize || 'Unknown'}
Website: ${lead.website || 'None'}

FIRST ANALYST SCORE: ${claudeScore.score}/10
FIRST ANALYST REASONING: ${claudeScore.reasoning}
TOP SERVICES IDENTIFIED: ${claudeScore.topServices?.join(', ')}
BUDGET POTENTIAL: ${claudeScore.budgetPotential}

ORIGINAL ANALYSIS:
${analysis}

Respond ONLY in this exact JSON format — no extra text:
{
  "agreeWithScore": <true|false>,
  "reviewerScore": <number 1-10>,
  "finalScore": <average of both, 1 decimal>,
  "adjustment": "<none|increase|decrease>",
  "adjustmentReason": "<1-2 sentences>",
  "missedOpportunities": ["<opportunity1>", "<opportunity2>"],
  "redFlags": ["<flag1>", "<flag2>"],
  "recommendation": "<pursue|nurture|skip>",
  "recommendationReason": "<1 sentence>"
}
`

    const result = await ai2.ask(prompt, { maxTokens: 600 })

    if (!result.success) {
      throw new Error(result.error)
    }

    let reviewData
    try {
      const cleaned = result.text.replace(/```json|```/g, '').trim()
      reviewData = JSON.parse(cleaned)
    } catch {
      reviewData = {
        agreeWithScore: true,
        reviewerScore: claudeScore.score,
        finalScore: claudeScore.score,
        adjustment: 'none',
        adjustmentReason: 'Review parse error — using primary score',
        missedOpportunities: [],
        redFlags: [],
        recommendation: claudeScore.score >= 7 ? 'pursue' : claudeScore.score >= 4 ? 'nurture' : 'skip',
        recommendationReason: 'Based on primary analysis'
      }
    }

    reviewData.finalScore = parseFloat(
      ((claudeScore.score + reviewData.reviewerScore) / 2).toFixed(1)
    )

    return {
      success: true,
      reviewData,
      tokensUsed: result.tokensUsed,
      provider: result.provider,
      model: result.model
    }
  } catch (error) {
    console.error('[ReviewerAgent] Error:', error.message)
    return {
      success: false,
      reviewData: {
        agreeWithScore: true,
        reviewerScore: claudeScore.score,
        finalScore: claudeScore.score,
        adjustment: 'none',
        adjustmentReason: 'Review failed — using primary score',
        missedOpportunities: [],
        redFlags: [],
        recommendation: claudeScore.score >= 7 ? 'pursue' : claudeScore.score >= 4 ? 'nurture' : 'skip',
        recommendationReason: 'Based on primary analysis only'
      },
      error: error.message
    }
  }
}
