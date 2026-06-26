import dotenv from 'dotenv'
import { createProvider, PROVIDER_INFO } from '../providers/index.js'
dotenv.config()

// Load and validate AI configuration from environment
const loadAIConfig = () => ({
  ai1: {
    provider: process.env.AI_1_PROVIDER || 'anthropic',
    apiKey: process.env.AI_1_API_KEY || '',
    model: process.env.AI_1_MODEL || 'claude-haiku-4-5'
  },
  ai2: {
    provider: process.env.AI_2_PROVIDER || 'openai',
    apiKey: process.env.AI_2_API_KEY || '',
    model: process.env.AI_2_MODEL || 'gpt-4o-mini'
  }
})

// Singleton provider instances
let _ai1Instance = null
let _ai2Instance = null

// Get AI Agent 1 (Primary — Analyzer, Scorer, Pitch)
export const getAI1 = () => {
  if (!_ai1Instance) {
    const config = loadAIConfig()
    if (!config.ai1.apiKey) {
      throw new Error(
        'AI_1_API_KEY is not set in environment variables. ' +
        'Add AI_1_PROVIDER and AI_1_API_KEY to your .env file.'
      )
    }
    _ai1Instance = createProvider(config.ai1.provider, config.ai1.apiKey, config.ai1.model)
    console.log(`[AIConfig] Agent 1 initialized: ${config.ai1.provider} / ${config.ai1.model}`)
  }
  return _ai1Instance
}

// Get AI Agent 2 (Secondary — Reviewer, Discussant). Optional.
export const getAI2 = () => {
  if (!_ai2Instance) {
    const config = loadAIConfig()
    if (!config.ai2.apiKey) {
      console.warn(
        '[AIConfig] AI_2_API_KEY not set — reviewer and discussion features disabled. ' +
        'Add AI_2_PROVIDER and AI_2_API_KEY to enable.'
      )
      return null
    }
    _ai2Instance = createProvider(config.ai2.provider, config.ai2.apiKey, config.ai2.model)
    console.log(`[AIConfig] Agent 2 initialized: ${config.ai2.provider} / ${config.ai2.model}`)
  }
  return _ai2Instance
}

// Reset instances (used when env changes or for testing)
export const resetAIInstances = () => {
  _ai1Instance = null
  _ai2Instance = null
}

// Get current AI configuration status (safe — no keys exposed)
export const getAIConfigStatus = () => {
  const config = loadAIConfig()
  return {
    ai1: {
      provider: config.ai1.provider,
      model: config.ai1.model,
      configured: !!config.ai1.apiKey,
      providerInfo: PROVIDER_INFO[config.ai1.provider] || null
    },
    ai2: {
      provider: config.ai2.provider,
      model: config.ai2.model,
      configured: !!config.ai2.apiKey,
      providerInfo: PROVIDER_INFO[config.ai2.provider] || null
    }
  }
}
