import { getAI1, getAI2 } from '../config/aiConfig.js'

export const runAgentDiscussion = async (lead, initialAnalysis, initialScore) => {
  const ai1 = getAI1()
  const ai2 = getAI2()

  if (!ai2) {
    return {
      success: false,
      discussion: [],
      consensusScore: initialScore,
      recommendation: initialScore >= 7 ? 'pursue' : initialScore >= 4 ? 'nurture' : 'skip',
      error: 'AI_2 not configured — discussion requires both AI agents'
    }
  }

  const discussion = []

  try {
    // Round 1 — AI 1 presents its case
    const round1 = await ai1.ask(
      `You are Agent Alpha at Pixel Works.
You analyzed ${lead.companyName} and gave it a score of ${initialScore}/10.
Briefly present your case to Agent Beta (2-3 key points why this lead deserves this score).
Be specific and data-driven. Max 150 words.`,
      { maxTokens: 400 }
    )

    const alphaPresentation = round1.success ? round1.text : 'Analysis unavailable'
    discussion.push({
      agent: `Agent Alpha (${ai1.providerName})`,
      round: 1,
      type: 'presentation',
      content: alphaPresentation
    })

    // Round 2 — AI 2 challenges or agrees
    const round2 = await ai2.ask(
      `You are Agent Beta at Pixel Works reviewing a lead.

Lead: ${lead.companyName} (${lead.industry || 'Unknown'}, ${lead.country || 'Unknown'})
Website: ${lead.website || 'None'}

Agent Alpha gave this lead ${initialScore}/10 and said:
"${alphaPresentation}"

Either challenge this with counter-points OR support it with additional evidence.
Be concise (max 120 words). End with: "My score: X/10"`,
      { maxTokens: 400 }
    )

    const betaChallenge = round2.success ? round2.text : 'Review unavailable'
    discussion.push({
      agent: `Agent Beta (${ai2.providerName})`,
      round: 2,
      type: 'challenge',
      content: betaChallenge
    })

    // Extract Beta score
    const betaScoreMatch = betaChallenge.match(/(?:my score|score)[:\s]+([0-9.]+)\s*\/\s*10/i)
    const betaScore = betaScoreMatch ? parseFloat(betaScoreMatch[1]) : initialScore

    // Round 3 — AI 1 gives final verdict
    const round3 = await ai1.ask(
      `You are Agent Alpha.
Agent Beta responded to your analysis of ${lead.companyName}:
"${betaChallenge}"

Give a brief final response (max 100 words).
End with exactly:
FINAL SCORE: X/10
RECOMMENDATION: pursue|nurture|skip`,
      { maxTokens: 300 }
    )

    const alphaFinal = round3.success ? round3.text : `FINAL SCORE: ${initialScore}/10\nRECOMMENDATION: ${initialScore >= 7 ? 'pursue' : 'nurture'}`
    discussion.push({
      agent: `Agent Alpha (${ai1.providerName})`,
      round: 3,
      type: 'final',
      content: alphaFinal
    })

    // Parse final results
    const finalScoreMatch = alphaFinal.match(/FINAL SCORE:\s*([0-9.]+)/i)
    const recommendationMatch = alphaFinal.match(/RECOMMENDATION:\s*(pursue|nurture|skip)/i)

    const alphaFinalScore = finalScoreMatch ? parseFloat(finalScoreMatch[1]) : initialScore
    const consensusScore = parseFloat(((alphaFinalScore + betaScore) / 2).toFixed(1))
    const recommendation = recommendationMatch
      ? recommendationMatch[1].toLowerCase()
      : consensusScore >= 7 ? 'pursue' : consensusScore >= 4 ? 'nurture' : 'skip'

    return {
      success: true,
      discussion,
      agentScores: {
        alpha: initialScore,
        beta: betaScore,
        alphaFinal: alphaFinalScore
      },
      consensusScore: Math.min(10, Math.max(1, consensusScore)),
      recommendation,
      agents: {
        ai1: `${ai1.providerName} / ${ai1.model}`,
        ai2: `${ai2.providerName} / ${ai2.model}`
      },
      discussionSummary: `Alpha (${ai1.providerName}): ${initialScore}/10 → Beta (${ai2.providerName}): ${betaScore}/10 → Consensus: ${consensusScore}/10`
    }
  } catch (error) {
    console.error('[Discussion] Error:', error.message)
    return {
      success: false,
      discussion,
      consensusScore: initialScore,
      recommendation: initialScore >= 7 ? 'pursue' : initialScore >= 4 ? 'nurture' : 'skip',
      error: error.message
    }
  }
}
