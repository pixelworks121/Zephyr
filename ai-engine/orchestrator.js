import { analyzeLead } from './agents/lead-analyzer.js'
import { scoreLead } from './agents/lead-scorer.js'
import { generatePitch } from './agents/pitch-generator.js'
import { reviewLead } from './agents/reviewer-agent.js'

export const runLeadPipeline = async (lead, options = {}) => {
  const {
    skipReview = false,   // set true to skip OpenAI reviewer (saves cost)
    skipPitch = false     // set true to skip pitch generation
  } = options

  console.log(`[Orchestrator] Starting pipeline for: ${lead.companyName}`)

  const result = {
    leadId: lead.id || null,
    companyName: lead.companyName,
    success: false,
    analysis: null,
    scoreData: null,
    reviewData: null,
    pitchData: null,
    finalScore: null,
    recommendation: null,
    whyGoodProspect: null,
    recommendedServices: null,
    emailTemplate: null,
    callScript: null,
    totalTokensUsed: 0,
    errors: [],
    completedAt: null
  }

  // Step 1 — Analyze
  console.log(`[Orchestrator] Step 1: Analyzing ${lead.companyName}...`)
  const analyzeResult = await analyzeLead(lead)
  if (!analyzeResult.success) {
    result.errors.push({ step: 'analyze', error: analyzeResult.error })
    console.error(`[Orchestrator] Analysis failed for ${lead.companyName}`)
    return result
  }
  result.analysis = analyzeResult.analysis
  result.totalTokensUsed += analyzeResult.tokensUsed || 0

  // Step 2 — Score
  console.log(`[Orchestrator] Step 2: Scoring ${lead.companyName}...`)
  const scoreResult = await scoreLead(lead, result.analysis)
  if (!scoreResult.success) {
    result.errors.push({ step: 'score', error: scoreResult.error })
    console.error(`[Orchestrator] Scoring failed for ${lead.companyName}`)
    return result
  }
  result.scoreData = scoreResult.scoreData
  result.totalTokensUsed += scoreResult.tokensUsed || 0

  // Step 3 — Review (optional second agent) or Discussion
  if (options.useDiscussion && !options.skipReview) {
    console.log(`[Orchestrator] Running agent discussion for ${lead.companyName}...`)
    const { runAgentDiscussion } = await import('./agents/discussion.js')
    const discussionResult = await runAgentDiscussion(lead, result.analysis, result.scoreData.score)
    
    if (discussionResult.success) {
      result.discussionTranscript = discussionResult.discussion
      result.agentScores = discussionResult.agentScores
      result.finalScore = discussionResult.consensusScore
      result.recommendation = discussionResult.recommendation
    } else {
      // Fall back to regular review score
      result.finalScore = result.reviewData?.finalScore || result.scoreData?.score || 5
    }
  } else if (!skipReview) {
    console.log(`[Orchestrator] Step 3: Reviewing ${lead.companyName}...`)
    const reviewResult = await reviewLead(lead, result.analysis, result.scoreData)
    result.reviewData = reviewResult.reviewData
    result.totalTokensUsed += reviewResult.tokensUsed || 0
    if (!reviewResult.success) {
      result.errors.push({ step: 'review', error: reviewResult.error })
    }
  }

  // Step 4 — Generate Pitch (optional)
  if (!skipPitch) {
    console.log(`[Orchestrator] Step 4: Generating pitch for ${lead.companyName}...`)
    const pitchResult = await generatePitch(lead, result.analysis, result.scoreData)
    if (pitchResult.success) {
      result.pitchData = pitchResult.pitchData
      result.totalTokensUsed += pitchResult.tokensUsed || 0
    } else {
      result.errors.push({ step: 'pitch', error: pitchResult.error })
    }
  }

  // Compile final result (if not already set by discussion)
  if (!result.finalScore) {
    result.finalScore = result.reviewData?.finalScore || result.scoreData?.score || 5
  }
  if (!result.recommendation) {
    result.recommendation = result.reviewData?.recommendation ||
      (result.finalScore >= 7 ? 'pursue' : result.finalScore >= 4 ? 'nurture' : 'skip')
  }

  // Extract fields for DB storage
  result.whyGoodProspect = result.scoreData?.reasoning || null
  result.recommendedServices = result.scoreData?.topServices?.join(', ') || null
  result.emailTemplate = result.pitchData
    ? `SUBJECT: ${result.pitchData.coldEmail.subject}\n\n${result.pitchData.coldEmail.body}\n\n---FOLLOW UP---\nSUBJECT: ${result.pitchData.followUpEmail.subject}\n\n${result.pitchData.followUpEmail.body}`
    : null
  result.callScript = result.pitchData
    ? `OPENING:\n${result.pitchData.callScript.opening}\n\nDISCOVERY QUESTIONS:\n${result.pitchData.callScript.discoveryQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nVALUE PROP:\n${result.pitchData.callScript.valueProp}\n\nOBJECTION HANDLERS:\n- Has website: ${result.pitchData.callScript.objectionHandlers.hasWebsite}\n- No budget: ${result.pitchData.callScript.objectionHandlers.noBudget}\n- Send email: ${result.pitchData.callScript.objectionHandlers.sendEmail}\n\nCLOSING:\n${result.pitchData.callScript.closing}`
    : null

  result.success = true
  result.completedAt = new Date().toISOString()

  console.log(`[Orchestrator] Pipeline complete for ${lead.companyName} — Score: ${result.finalScore}, Recommendation: ${result.recommendation}`)

  return result
}
