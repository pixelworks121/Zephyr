import OpenAI from 'openai'
import { AIProvider } from './AIProvider.js'

export class OpenAIProvider extends AIProvider {
  constructor(apiKey, model = 'gpt-4o-mini') {
    super(apiKey, model)
    this.providerName = 'openai'
    this.client = new OpenAI({ apiKey })
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
      return {
        success: true,
        text: response.choices[0].message.content,
        tokensUsed: response.usage?.total_tokens || 0,
        provider: this.providerName,
        model: this.model
      }
    } catch (error) {
      return { success: false, error: error.message, provider: this.providerName }
    }
  }
}
