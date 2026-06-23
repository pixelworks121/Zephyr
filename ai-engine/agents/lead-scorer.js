import Anthropic from '@anthropic-ai/sdk'
import { buildScorePrompt } from '../prompts/score.prompt.js'
import dotenv from 'dotenv'
dotenv.config()

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'not-configured' })

export const scoreLead = async (lead, analysis) => {
  try {
    const prompt = buildScorePrompt(lead, analysis)

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    })

    const rawText = message.content[0].text.trim()

    // Parse JSON response safely
    let scoreData
    try {
      // Strip any markdown code fences if present
      const cleaned = rawText.replace(/```json|```/g, '').trim()
      scoreData = JSON.parse(cleaned)
    } catch (parseError) {
      console.error('[LeadScorer] JSON parse error:', parseError.message)
      // Fallback score if JSON is malformed
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

    // Clamp score between 1 and 10
    scoreData.score = Math.min(10, Math.max(1, parseFloat(scoreData.score) || 5))

    return {
      success: true,
      scoreData,
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens
    }
  } catch (error) {
    console.error('[LeadScorer] Error:', error.message)
    return {
      success: false,
      scoreData: null,
      error: error.message
    }
  }
}
