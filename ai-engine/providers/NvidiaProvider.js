import OpenAI from 'openai'
import { AIProvider } from './AIProvider.js'

// NVIDIA NIM (build.nvidia.com) is OpenAI-compatible — it serves many models
// (DeepSeek, Llama, etc.) through an OpenAI-style endpoint at
// https://integrate.api.nvidia.com/v1
export class NvidiaProvider extends AIProvider {
  constructor(apiKey, model = 'deepseek-ai/deepseek-v4-flash') {
    super(apiKey, model)
    this.providerName = 'nvidia'
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://integrate.api.nvidia.com/v1'
    })
  }

  async complete(messages, options = {}) {
    const { maxTokens = 1000 } = options
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: maxTokens,
        temperature: options.temperature ?? 0.7,
        top_p: 0.95
      })
      const message = response.choices[0].message
      // Some NVIDIA reasoning models populate `reasoning_content`; fall back to it
      // if the final content is empty.
      const text = message.content || message.reasoning_content || ''
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
