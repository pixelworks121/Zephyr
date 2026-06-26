import OpenAI from 'openai'
import { AIProvider } from './AIProvider.js'

// OpenRouter is OpenAI-compatible — it proxies many models (DeepSeek, Llama, Claude, etc.)
// through a single OpenAI-style endpoint at https://openrouter.ai/api/v1
export class OpenRouterProvider extends AIProvider {
  constructor(apiKey, model = 'deepseek/deepseek-r1') {
    super(apiKey, model)
    this.providerName = 'openrouter'
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1'
    })
  }

  async complete(messages, options = {}) {
    const { maxTokens = 1000 } = options
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: maxTokens,
        temperature: options.temperature || 0.7
      })
      const message = response.choices[0].message
      // Reasoning models (e.g. DeepSeek R1) may put output in `reasoning`
      // when the token budget is consumed before a final answer is emitted.
      const text = message.content || message.reasoning || ''
      return {
        success: true,
        text,
        tokensUsed: response.usage?.total_tokens || 0,
        provider: this.providerName,
        model: this.model
      }
    } catch (error) {
      return { success: false, error: error.message, provider: this.providerName }
    }
  }
}
