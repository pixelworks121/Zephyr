import { getAI1 } from '../config/aiConfig.js'
import { buildPitchPrompt } from '../prompts/pitch.prompt.js'

export const generatePitch = async (lead, analysis, scoreData) => {
  try {
    const ai1 = getAI1()
    const prompt = buildPitchPrompt(lead, analysis, scoreData)

    const result = await ai1.ask(prompt, { maxTokens: 2000 })

    if (!result.success) {
      return { success: false, pitchData: null, error: result.error }
    }

    let pitchData
    try {
      const cleaned = result.text.replace(/```json|```/g, '').trim()
      pitchData = JSON.parse(cleaned)
    } catch {
      pitchData = {
        coldEmail: {
          subject: `Helping ${lead.companyName} grow online`,
          body: `Hi ${lead.contactName || 'there'},\n\nI came across ${lead.companyName} and I think Pixel Works can help you grow your digital presence.\n\nWould you be open to a quick 15-minute call?\n\nBest,\nThe Pixel Works Team`
        },
        followUpEmail: {
          subject: `Quick follow-up — Pixel Works`,
          body: `Hi ${lead.contactName || 'there'},\n\nJust following up. Still think there's a great opportunity here.\n\nWorth a quick chat?\n\nBest,\nThe Pixel Works Team`
        },
        callScript: {
          opening: `Hi, this is [Your Name] from Pixel Works. I'll be brief — I came across ${lead.companyName} and had a thought about how we could help. Do you have 2 minutes?`,
          discoveryQuestions: [
            'What does your current digital presence look like?',
            'What is your biggest challenge getting new customers online?',
            'Have you worked with a digital agency before?'
          ],
          valueProp: `We help businesses in your industry get more clients through better websites and digital marketing.`,
          objectionHandlers: {
            hasWebsite: `That's great! We focus on making websites perform better, not just look better.`,
            noBudget: `I understand. Our work typically pays for itself through new business generated.`,
            sendEmail: `Of course! What's the best email for you?`
          },
          closing: `Are you free for a 15-minute call this week?`
        }
      }
    }

    return {
      success: true,
      pitchData,
      tokensUsed: result.tokensUsed,
      provider: result.provider,
      model: result.model
    }
  } catch (error) {
    console.error('[PitchGenerator] Error:', error.message)
    return { success: false, pitchData: null, error: error.message }
  }
}
