import { AIProvider } from './AIProvider.js'

export class GeminiProvider extends AIProvider {
  constructor(apiKey, model = 'gemini-1.5-flash') {
    super(apiKey, model)
    this.providerName = 'gemini'
  }

  async complete(messages, options = {}) {
    const { maxTokens = 1000 } = options
    try {
      // Dynamic import — only loads if gemini is actually used
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(this.apiKey)
      const geminiModel = genAI.getGenerativeModel({ model: this.model })

      // Convert messages array to Gemini format (alternating user/model turns)
      const lastMessage = messages[messages.length - 1]
      const history = messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))

      const chat = geminiModel.startChat({
        history,
        generationConfig: { maxOutputTokens: maxTokens }
      })

      const result = await chat.sendMessage(lastMessage.content)
      const text = result.response.text()

      return {
        success: true,
        text,
        tokensUsed: result.response.usageMetadata?.totalTokenCount || 0,
        provider: this.providerName,
        model: this.model
      }
    } catch (error) {
      return { success: false, error: error.message, provider: this.providerName }
    }
  }
}
