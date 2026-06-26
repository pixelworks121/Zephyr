// Base class — all providers extend this
export class AIProvider {
  constructor(apiKey, model) {
    this.apiKey = apiKey
    this.model = model
    this.providerName = 'base'
  }

  // All providers must implement this
  // messages: array of { role: 'user'|'assistant', content: string }
  // Returns: { success: true, text: string, tokensUsed: number }
  //       or { success: false, error: string }
  async complete(messages, options = {}) {
    throw new Error('complete() must be implemented by provider')
  }

  // Convenience method — single user message
  async ask(prompt, options = {}) {
    return this.complete([{ role: 'user', content: prompt }], options)
  }
}
