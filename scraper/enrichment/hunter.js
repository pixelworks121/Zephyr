import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

const HUNTER_API_KEY = process.env.HUNTER_API_KEY
const HUNTER_BASE = 'https://api.hunter.io/v2'

let monthlySearchCount = 0
let monthlyVerifyCount = 0
const FREE_TIER_SEARCH_LIMIT = 25
const FREE_TIER_VERIFY_LIMIT = 50

export const hunterDomainSearch = async (domain) => {
  if (!HUNTER_API_KEY) return { success: false, error: 'Hunter API key not configured' }
  if (monthlySearchCount >= FREE_TIER_SEARCH_LIMIT) return { success: false, error: 'Hunter free tier monthly search limit reached' }

  try {
    const response = await axios.get(`${HUNTER_BASE}/domain-search`, {
      params: { domain: domain.replace('www.', ''), api_key: HUNTER_API_KEY, limit: 5 }
    })
    monthlySearchCount++
    const data = response.data.data
    const emails = data.emails || []

    return {
      success: true,
      domain,
      organization: data.organization,
      emails: emails.map(e => ({
        email: e.value, type: e.type, confidence: e.confidence,
        firstName: e.first_name, lastName: e.last_name, position: e.position
      })),
      topEmail: emails[0]?.value || null,
      topContact: emails[0] ? {
        name: `${emails[0].first_name || ''} ${emails[0].last_name || ''}`.trim(),
        email: emails[0].value, position: emails[0].position
      } : null,
      creditsUsed: monthlySearchCount
    }
  } catch (error) {
    if (error.response?.status === 429) return { success: false, error: 'Hunter rate limit exceeded' }
    if (error.response?.status === 401) return { success: false, error: 'Hunter API key invalid' }
    return { success: false, error: error.message }
  }
}

export const hunterEmailFinder = async (domain, firstName, lastName) => {
  if (!HUNTER_API_KEY) return { success: false, error: 'Hunter API key not configured' }
  if (monthlySearchCount >= FREE_TIER_SEARCH_LIMIT) return { success: false, error: 'Hunter free tier monthly limit reached' }

  try {
    const response = await axios.get(`${HUNTER_BASE}/email-finder`, {
      params: { domain: domain.replace('www.', ''), first_name: firstName, last_name: lastName, api_key: HUNTER_API_KEY }
    })
    monthlySearchCount++
    const data = response.data.data
    return { success: true, email: data.email, score: data.score, firstName: data.first_name, lastName: data.last_name }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export const hunterVerifyEmail = async (email) => {
  if (!HUNTER_API_KEY) return { success: false, error: 'Hunter API key not configured' }
  if (monthlyVerifyCount >= FREE_TIER_VERIFY_LIMIT) return { success: false, error: 'Hunter free tier monthly verify limit reached' }

  try {
    const response = await axios.get(`${HUNTER_BASE}/email-verifier`, {
      params: { email, api_key: HUNTER_API_KEY }
    })
    monthlyVerifyCount++
    const data = response.data.data
    return {
      success: true, email, status: data.status, score: data.score,
      isValid: data.status === 'valid', regexp: data.regexp, gibberish: data.gibberish, disposable: data.disposable
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export const getHunterUsage = () => ({
  searches: { used: monthlySearchCount, limit: FREE_TIER_SEARCH_LIMIT, remaining: FREE_TIER_SEARCH_LIMIT - monthlySearchCount },
  verifications: { used: monthlyVerifyCount, limit: FREE_TIER_VERIFY_LIMIT, remaining: FREE_TIER_VERIFY_LIMIT - monthlyVerifyCount }
})

export const smartHunterEnrich = async (lead, minScore = 7) => {
  if (lead.aiScore && lead.aiScore < minScore) return { success: false, skipped: true, reason: `Score ${lead.aiScore} below threshold ${minScore}` }
  if (!lead.website) return { success: false, error: 'No website to extract domain from' }

  const domain = lead.website.replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0]
  return await hunterDomainSearch(domain)
}
