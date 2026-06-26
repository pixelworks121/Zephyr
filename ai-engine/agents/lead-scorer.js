import { getAI1 } from '../config/aiConfig.js'
import { buildScorePrompt } from '../prompts/score.prompt.js'

export const scoreLead = async (lead, analysis) => {
  try {
    const ai1 = getAI1()
    const prompt = buildScorePrompt(lead, analysis)

    const result = await ai1.ask(prompt, { maxTokens: 500 })

    if (!result.success) {
      return { success: false, scoreData: null, error: result.error }
    }

    let scoreData
    try {
      const cleaned = result.text.replace(/```json|```/g, '').trim()
      scoreData = JSON.parse(cleaned)
    } catch {
      scoreData = {
        score: 5,
        reasoning: 'Score generated with limited data',
        serviceAlignment: 5,
        budgetPotential: 'medium',
        growthStage: 'growth',
        topServices: ['Website Design', 'SEO'],
        urgency: 'medium',
        confidence: 'low'
      }
    }

    scoreData.score = Math.min(10, Math.max(1, parseFloat(scoreData.score) || 5))

    return {
      success: true,
      scoreData,
      tokensUsed: result.tokensUsed,
      provider: result.provider,
      model: result.model
    }
  } catch (error) {
    console.error('[LeadScorer] Error:', error.message)
    return { success: false, scoreData: null, error: error.message }
  }
}
