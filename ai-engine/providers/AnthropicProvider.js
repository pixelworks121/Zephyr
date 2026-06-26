import Anthropic from '@anthropic-ai/sdk'
import { AIProvider } from './AIProvider.js'

export class AnthropicProvider extends AIProvider {
  constructor(apiKey, model = 'claude-haiku-4-5') {
    super(apiKey, model)
    this.providerName = 'anthropic'
    this.client = new Anthropic({ apiKey })
  }

  async complete(messages, options = {}) {
    const { maxTokens = 1000 } = options
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        messages
      })
      return {
        success: true,
        text: response.content[0].text,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        provider: this.providerName,
        model: this.model
      }
    } catch (error) {
      return { success: false, error: error.message, provider: this.providerName }
    }
  }
}
