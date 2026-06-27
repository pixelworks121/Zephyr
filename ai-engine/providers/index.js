import { AnthropicProvider } from './AnthropicProvider.js'
import { OpenAIProvider } from './OpenAIProvider.js'
import { GeminiProvider } from './GeminiProvider.js'
import { GroqProvider } from './GroqProvider.js'
import { OpenRouterProvider } from './OpenRouterProvider.js'
import { NvidiaProvider } from './NvidiaProvider.js'

// Supported providers map
const PROVIDERS = {
  anthropic: AnthropicProvider,
  openai: OpenAIProvider,
  gemini: GeminiProvider,
  groq: GroqProvider,
  openrouter: OpenRouterProvider,
  nvidia: NvidiaProvider
}

// Supported providers info (for status endpoint)
export const PROVIDER_INFO = {
  anthropic: {
    name: 'Anthropic Claude',
    models: ['claude-haiku-4-5', 'claude-sonnet-4-5', 'claude-opus-4-5'],
    defaultModel: 'claude-haiku-4-5'
  },
  openai: {
    name: 'OpenAI GPT',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
    defaultModel: 'gpt-4o-mini'
  },
  gemini: {
    name: 'Google Gemini',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro'],
    defaultModel: 'gemini-1.5-flash'
  },
  groq: {
    name: 'Groq',
    models: ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768'],
    defaultModel: 'llama3-8b-8192'
  },
  openrouter: {
    name: 'OpenRouter',
    models: ['deepseek/deepseek-r1', 'deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct'],
    defaultModel: 'deepseek/deepseek-r1'
  },
  nvidia: {
    name: 'NVIDIA NIM',
    models: ['deepseek-ai/deepseek-v4-flash', 'deepseek-ai/deepseek-r1', 'meta/llama-3.3-70b-instruct'],
    defaultModel: 'deepseek-ai/deepseek-v4-flash'
  }
}

// Factory function — creates provider instance from env config
export const createProvider = (providerName, apiKey, model) => {
  const normalizedName = providerName?.toLowerCase()?.trim()

  if (!normalizedName) {
    throw new Error('Provider name is required (anthropic/openai/gemini/groq)')
  }

  if (!apiKey) {
    throw new Error(`API key is required for provider: ${normalizedName}`)
  }

  const ProviderClass = PROVIDERS[normalizedName]
  if (!ProviderClass) {
    throw new Error(
      `Unsupported provider: "${normalizedName}". Supported: ${Object.keys(PROVIDERS).join(', ')}`
    )
  }

  const defaultModel = PROVIDER_INFO[normalizedName]?.defaultModel
  return new ProviderClass(apiKey, model || defaultModel)
}

export { AnthropicProvider, OpenAIProvider, GeminiProvider, GroqProvider, OpenRouterProvider, NvidiaProvider }
