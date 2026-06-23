export const buildPitchPrompt = (lead, analysis, scoreData) => {
  return `
You are an expert sales copywriter for Pixel Works digital agency.

Based on this lead's profile and analysis, create highly personalized outreach materials.

LEAD PROFILE:
Company: ${lead.companyName}
Contact Name: ${lead.contactName || 'Decision Maker'}
Industry: ${lead.industry || 'Unknown'}
Country: ${lead.country || 'Unknown'}
Website: ${lead.website || 'Not provided'}
Recommended Services: ${scoreData.topServices?.join(', ') || 'Digital Services'}
Budget Potential: ${scoreData.budgetPotential || 'Unknown'}
Urgency: ${scoreData.urgency || 'medium'}

ANALYSIS SUMMARY:
${analysis}

Create the following outreach materials:

1. COLD EMAIL
   - Subject line (compelling, personalized, max 60 chars)
   - Email body (150-200 words max)
   - Professional but conversational tone
   - Reference something specific about their business
   - Clear value proposition
   - Single clear call to action (schedule a call)
   - Sign off as "The Pixel Works Team"
   - Do NOT use generic phrases like "I hope this email finds you well"
   - Do NOT be pushy or salesy

2. FOLLOW-UP EMAIL (sent if no reply after 5 days)
   - Different angle from the first email
   - Shorter (80-100 words)
   - Add a specific insight or tip relevant to their business
   - Same call to action

3. CALL SCRIPT
   - Opening (10 seconds) — who you are, why you're calling
   - Discovery questions (3 questions to understand their situation)
   - Value proposition (30 seconds tailored to their industry)
   - Objection handlers for:
     a) "We already have a website/developer"
     b) "We don't have budget right now"
     c) "Send me an email"
   - Closing — how to schedule the next step

You MUST respond in this EXACT JSON format and nothing else:
{
  "coldEmail": {
    "subject": "<subject line>",
    "body": "<full email body>"
  },
  "followUpEmail": {
    "subject": "<subject line>",
    "body": "<full email body>"
  },
  "callScript": {
    "opening": "<opening lines>",
    "discoveryQuestions": ["<q1>", "<q2>", "<q3>"],
    "valueProp": "<value proposition speech>",
    "objectionHandlers": {
      "hasWebsite": "<response>",
      "noBudget": "<response>",
      "sendEmail": "<response>"
    },
    "closing": "<closing lines>"
  }
}
`
}
