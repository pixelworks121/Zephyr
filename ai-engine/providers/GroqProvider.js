import { AIProvider } from './AIProvider.js'

export class GroqProvider extends AIProvider {
  constructor(apiKey, model = 'llama3-8b-8192') {
    super(apiKey, model)
    this.providerName = 'groq'
  }

  async complete(messages, options = {}) {
    const { maxTokens = 1000 } = options
    try {
      // Groq is OpenAI-compatible — dynamic import so missing pkg never crashes app
      const { default: Groq } = await import('groq-sdk')
      const client = new Groq({ apiKey: this.apiKey })

      const response = await client.chat.completions.create({
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
