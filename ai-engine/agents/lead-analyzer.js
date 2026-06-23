import Anthropic from '@anthropic-ai/sdk'
import { buildAnalyzePrompt } from '../prompts/analyze.prompt.js'
import dotenv from 'dotenv'
dotenv.config()

// Fallback key prevents the SDK from throwing at import time when no key is set.
// Real API calls without a valid key fail gracefully via the try/catch below.
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'not-configured' })

export const analyzeLead = async (lead) => {
  try {
    const prompt = buildAnalyzePrompt(lead)

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })

    const analysis = message.content[0].text

    return {
      success: true,
      analysis,
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens
    }
  } catch (error) {
    console.error('[LeadAnalyzer] Error:', error.message)
    return {
      success: false,
      analysis: null,
      error: error.message
    }
  }
}
