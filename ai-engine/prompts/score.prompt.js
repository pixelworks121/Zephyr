export const buildScorePrompt = (lead, analysis) => {
  return `
You are a lead scoring specialist for Pixel Works digital agency.

Based on the following lead information and analysis, provide a precise lead score.

LEAD INFORMATION:
Company: ${lead.companyName}
Industry: ${lead.industry || 'Unknown'}
Country: ${lead.country || 'Unknown'}
Business Size: ${lead.businessSize || 'Unknown'}
Website: ${lead.website || 'Not provided'}
Has Email: ${lead.email ? 'Yes' : 'No'}
Has Social Media: ${lead.linkedinUrl || lead.twitterUrl ? 'Yes' : 'No'}

ANALYSIS:
${analysis}

Score this lead from 1 to 10 using these exact criteria:

SCORING CRITERIA:
- 9-10: Perfect fit. Clear need for Pixel Works services, strong budget signals, accessible contact, high growth indicators
- 7-8: Strong fit. Good match for services, reasonable budget, contactable, solid opportunity
- 5-6: Moderate fit. Some alignment with services, unclear budget, may need nurturing
- 3-4: Weak fit. Limited alignment, low budget signals, difficult to reach
- 1-2: Poor fit. Wrong industry, no budget signals, or not a real business prospect

SCORING FACTORS (weight each):
1. Service alignment (30%) — how well do Pixel Works services match their needs?
2. Budget potential (25%) — signals of ability to pay for quality digital work
3. Growth stage (20%) — are they at a stage where they need to invest in digital?
4. Reachability (15%) — do we have contact info? Are they responsive online?
5. Geography/Market (10%) — is this a market Pixel Works can serve effectively?

You MUST respond in this EXACT JSON format and nothing else:
{
  "score": <number 1-10, can be decimal like 7.5>,
  "reasoning": "<2-3 sentences explaining the score>",
  "serviceAlignment": "<score 1-10>",
  "budgetPotential": "<low|medium|high>",
  "growthStage": "<early|growth|mature|declining>",
  "topServices": ["<service1>", "<service2>", "<service3>"],
  "urgency": "<low|medium|high>",
  "confidence": "<low|medium|high>"
}
`
}
