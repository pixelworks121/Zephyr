import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import dotenv from 'dotenv'
dotenv.config()

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'not-configured' })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'not-configured' })

export const runAgentDiscussion = async (lead, initialAnalysis, initialScore) => {
  const discussion = []

  try {
    // Round 1 — Claude presents its case
    const claudePresentation = await claude.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: `You are Agent Alpha at Pixel Works.\nYou analyzed ${lead.companyName} and gave it a score of ${initialScore}/10.\nBriefly present your case to Agent Beta (2-3 key points why this lead is worth this score).\nBe specific and data-driven. Max 150 words.` }]
    })
    const alphaPresentation = claudePresentation.content[0].text
    discussion.push({ agent: 'Alpha (Claude)', round: 1, type: 'presentation', content: alphaPresentation })

    // Round 2 — GPT challenges or agrees
    const gptChallenge = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: `You are Agent Beta at Pixel Works reviewing a lead analysis.\n\nLead: ${lead.companyName} (${lead.industry || 'Unknown industry'}, ${lead.country || 'Unknown country'})\nWebsite: ${lead.website || 'None'}\n\nAgent Alpha gave this lead a score of ${initialScore}/10 and said:\n"${alphaPresentation}"\n\nAs Agent Beta, either:\na) Challenge this assessment with specific counter-points, OR\nb) Support it with additional evidence\n\nBe concise (max 120 words). End with your own score (1-10) for this lead.` }],
      max_tokens: 400
    })
    const betaChallenge = gptChallenge.choices[0].message.content
    discussion.push({ agent: 'Beta (GPT)', round: 2, type: 'challenge', content: betaChallenge })

    // Extract Beta's score
    const betaScoreMatch = betaChallenge.match(/\b([0-9](?:\.\d)?|10)\s*\/\s*10\b|\bscore[:\s]+([0-9](?:\.\d)?|10)\b/i)
    const betaScore = betaScoreMatch ? parseFloat(betaScoreMatch[1] || betaScoreMatch[2]) : initialScore

    // Round 3 — Claude final response
    const claudeFinal = await claude.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: `You are Agent Alpha.\nAgent Beta responded to your analysis of ${lead.companyName}:\n"${betaChallenge}"\n\nGive a brief final response (max 100 words) and confirm or adjust your score.\nEnd with: "FINAL SCORE: X/10" and "RECOMMENDATION: pursue|nurture|skip"` }]
    })
    const alphaFinal = claudeFinal.content[0].text
    discussion.push({ agent: 'Alpha (Claude)', round: 3, type: 'final', content: alphaFinal })

    const finalScoreMatch = alphaFinal.match(/FINAL SCORE:\s*([0-9.]+)/i)
    const recommendationMatch = alphaFinal.match(/RECOMMENDATION:\s*(pursue|nurture|skip)/i)

    const alphaFinalScore = finalScoreMatch ? parseFloat(finalScoreMatch[1]) : initialScore
    const consensusScore = parseFloat(((alphaFinalScore + betaScore) / 2).toFixed(1))
    const recommendation = recommendationMatch ? recommendationMatch[1].toLowerCase() :
      (consensusScore >= 7 ? 'pursue' : consensusScore >= 4 ? 'nurture' : 'skip')

    return {
      success: true, discussion,
      agentScores: { alpha: initialScore, beta: betaScore, alphaFinal: alphaFinalScore },
      consensusScore: Math.min(10, Math.max(1, consensusScore)),
      recommendation,
      discussionSummary: `Alpha: ${initialScore}/10 → Beta: ${betaScore}/10 → Consensus: ${consensusScore}/10`
    }
  } catch (error) {
    console.error('[Discussion] Error:', error.message)
    return {
      success: false, discussion,
      consensusScore: initialScore,
      recommendation: initialScore >= 7 ? 'pursue' : initialScore >= 4 ? 'nurture' : 'skip',
      error: error.message
    }
  }
}
