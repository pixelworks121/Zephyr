import OpenAI from 'openai'
import dotenv from 'dotenv'
dotenv.config()

// Fallback key prevents the SDK from throwing at import time when no key is set.
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'not-configured' })

export const reviewLead = async (lead, analysis, claudeScore) => {
  try {
    const prompt = `
You are a second-opinion analyst at Pixel Works digital agency.
Another analyst has already reviewed this lead. Your job is to independently verify their assessment.

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

Review this assessment and provide your independent opinion.
Do you agree with the score? Are there factors the first analyst missed?

Respond ONLY in this exact JSON format:
{
  "agreeWithScore": <true|false>,
  "reviewerScore": <number 1-10>,
  "finalScore": <average of both scores, 1 decimal>,
  "adjustment": "<none|increase|decrease>",
  "adjustmentReason": "<why you agree or disagree, 1-2 sentences>",
  "missedOpportunities": ["<opportunity1>", "<opportunity2>"],
  "redFlags": ["<flag1>", "<flag2>"],
  "recommendation": "<pursue|nurture|skip>",
  "recommendationReason": "<1 sentence>"
}
`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0.3
    })

    const rawText = response.choices[0].message.content.trim()

    let reviewData
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim()
      reviewData = JSON.parse(cleaned)
    } catch (parseError) {
      reviewData = {
        agreeWithScore: true,
        reviewerScore: claudeScore.score,
        finalScore: claudeScore.score,
        adjustment: 'none',
        adjustmentReason: 'Review unavailable — using primary score',
        missedOpportunities: [],
        redFlags: [],
        recommendation: claudeScore.score >= 7 ? 'pursue' : claudeScore.score >= 4 ? 'nurture' : 'skip',
        recommendationReason: 'Based on primary analysis score'
      }
    }

    reviewData.finalScore = parseFloat(((claudeScore.score + reviewData.reviewerScore) / 2).toFixed(1))

    return {
      success: true,
      reviewData,
      tokensUsed: response.usage?.total_tokens || 0
    }
  } catch (error) {
    console.error('[ReviewerAgent] Error:', error.message)

    // Graceful fallback if OpenAI is unavailable
    const fallbackReview = {
      agreeWithScore: true,
      reviewerScore: claudeScore.score,
      finalScore: claudeScore.score,
      adjustment: 'none',
      adjustmentReason: 'Second review unavailable — using primary score',
      missedOpportunities: [],
      redFlags: [],
      recommendation: claudeScore.score >= 7 ? 'pursue' : claudeScore.score >= 4 ? 'nurture' : 'skip',
      recommendationReason: 'Based on primary analysis score only'
    }

    return {
      success: false,
      reviewData: fallbackReview,
      error: error.message
    }
  }
}
