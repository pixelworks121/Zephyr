import Anthropic from '@anthropic-ai/sdk'
import { buildPitchPrompt } from '../prompts/pitch.prompt.js'
import dotenv from 'dotenv'
dotenv.config()

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'not-configured' })

export const generatePitch = async (lead, analysis, scoreData) => {
  try {
    const prompt = buildPitchPrompt(lead, analysis, scoreData)

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })

    const rawText = message.content[0].text.trim()

    let pitchData
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim()
      pitchData = JSON.parse(cleaned)
    } catch (parseError) {
      console.error('[PitchGenerator] JSON parse error:', parseError.message)
      pitchData = {
        coldEmail: {
          subject: `Helping ${lead.companyName} grow online`,
          body: `Hi ${lead.contactName || 'there'},\n\nI came across ${lead.companyName} and was impressed by what you're building. At Pixel Works, we help businesses like yours strengthen their digital presence.\n\nWould you be open to a quick 15-minute call this week?\n\nBest,\nThe Pixel Works Team`
        },
        followUpEmail: {
          subject: `Quick follow-up — Pixel Works`,
          body: `Hi ${lead.contactName || 'there'},\n\nJust following up on my previous email. Still think there's a great opportunity here for ${lead.companyName}.\n\nWorth a quick chat?\n\nBest,\nThe Pixel Works Team`
        },
        callScript: {
          opening: `Hi, is this ${lead.contactName || 'the business owner'}? Great — this is [Your Name] from Pixel Works. I'll be very brief — I came across ${lead.companyName} and had a quick thought about how we could help. Do you have 2 minutes?`,
          discoveryQuestions: [
            'What does your current digital presence look like?',
            'What is your biggest challenge in getting new customers online?',
            'Have you worked with a digital agency before?'
          ],
          valueProp: `We help businesses in your industry get more clients through better websites and digital marketing. Most of our clients see results within 60 days.`,
          objectionHandlers: {
            hasWebsite: `That's great! We actually work with businesses that already have websites — we focus on making them perform better, not just look better.`,
            noBudget: `I completely understand. That's actually why I'm calling — we offer flexible plans and our work typically pays for itself through new business.`,
            sendEmail: `Of course! I'll send that over right now. What is the best email for you?`
          },
          closing: `I'd love to show you some examples of what we've done for similar businesses. Are you free for a 15-minute call this week or next?`
        }
      }
    }

    return {
      success: true,
      pitchData,
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens
    }
  } catch (error) {
    console.error('[PitchGenerator] Error:', error.message)
    return {
      success: false,
      pitchData: null,
      error: error.message
    }
  }
}
