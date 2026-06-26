import { getAI1 } from '../config/aiConfig.js'
import { buildAnalyzePrompt } from '../prompts/analyze.prompt.js'

export const analyzeLead = async (lead) => {
  try {
    const ai1 = getAI1()
    const prompt = buildAnalyzePrompt(lead)

    const result = await ai1.ask(prompt, { maxTokens: 1500 })

    if (!result.success) {
      return { success: false, analysis: null, error: result.error }
    }

    return {
      success: true,
      analysis: result.text,
      tokensUsed: result.tokensUsed,
      provider: result.provider,
      model: result.model
    }
  } catch (error) {
    console.error('[LeadAnalyzer] Error:', error.message)
    return { success: false, analysis: null, error: error.message }
  }
}
