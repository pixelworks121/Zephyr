import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

const SERPER_API_KEY = process.env.SERPER_API_KEY
const SERPER_BASE = 'https://google.serper.dev'

// Track daily usage — Serper free tier: 2500 total queries
let totalQueriesUsed = 0

// Main search function — replaces googleSearch()
// Returns array of { title, url, snippet, displayLink }
export const serperSearch = async (query, options = {}) => {
  const { num = 10, type = 'search' } = options

  if (!SERPER_API_KEY) {
    console.warn('[Serper] SERPER_API_KEY not set — skipping search')
    return { success: false, results: [], error: 'SERPER_API_KEY not configured' }
  }

  try {
    const response = await axios.post(
      `${SERPER_BASE}/${type}`,
      {
        q: query,
        num: Math.min(num, 10),
        gl: 'us',
        hl: 'en'
      },
      {
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    )

    totalQueriesUsed++
    console.log(`[Serper] Query #${totalQueriesUsed}: "${query}"`)

    const organic = response.data.organic || []

    return {
      success: true,
      results: organic.map(item => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        displayLink: item.displayLink || new URL(item.link).hostname
      })),
      totalResults: response.data.searchParameters?.num || organic.length,
      creditsUsed: totalQueriesUsed
    }
  } catch (error) {
    const status = error.response?.status
    const message = error.response?.data?.message || error.message

    if (status === 401) {
      console.error('[Serper] Invalid API key')
      return { success: false, results: [], error: 'Invalid Serper API key' }
    }
    if (status === 429) {
      console.error('[Serper] Rate limit exceeded')
      return { success: false, results: [], error: 'Serper rate limit exceeded' }
    }

    console.error('[Serper] Error:', message)
    return { success: false, results: [], error: message }
  }
}

// Keep googleSearch as an alias for backward compatibility
// All existing code that calls googleSearch() will still work
export const googleSearch = serperSearch

// Generate smart search queries for finding leads
// targetType: 'agency' | 'ecommerce' | 'startup' | 'local' | 'saas'
export const generateLeadSearchQueries = (targetType, region = '') => {
  const regionSuffix = region ? ` ${region}` : ''

  const queryTemplates = {
    agency: [
      `marketing agency${regionSuffix} website`,
      `digital marketing company${regionSuffix}`,
      `branding agency${regionSuffix} services`,
      `creative agency${regionSuffix} portfolio`,
      `advertising agency${regionSuffix} clients`
    ],
    ecommerce: [
      `online store${regionSuffix} products`,
      `ecommerce business${regionSuffix} shop`,
      `shopify store${regionSuffix} products`,
      `woocommerce store${regionSuffix}`,
      `dropshipping store${regionSuffix}`
    ],
    startup: [
      `startup${regionSuffix} app launch`,
      `new saas product${regionSuffix}`,
      `tech startup${regionSuffix} funding`,
      `software startup${regionSuffix} beta`,
      `fintech startup${regionSuffix}`
    ],
    local: [
      `local business${regionSuffix} website`,
      `restaurant${regionSuffix} website`,
      `salon${regionSuffix} booking website`,
      `gym${regionSuffix} fitness website`,
      `dental clinic${regionSuffix} website`
    ],
    saas: [
      `b2b saas company${regionSuffix}`,
      `software company${regionSuffix} product`,
      `cloud software${regionSuffix} solution`,
      `enterprise software${regionSuffix}`,
      `hr software${regionSuffix} solution`
    ]
  }

  return queryTemplates[targetType] || queryTemplates.agency
}

// Extract domain from URL
export const extractDomainFromUrl = (url) => {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return null
  }
}

// Convert search result to a rough lead object
export const searchResultToLead = (result) => {
  const domain = extractDomainFromUrl(result.url)
  const companyName = result.title
    .split('|')[0]
    .split('-')[0]
    .split('–')[0]
    .trim()

  return {
    companyName: companyName || domain || 'Unknown',
    website: result.url,
    snippet: result.snippet,
    source: 'AI_DISCOVERED'
  }
}

// Domains to exclude from lead discovery
export const EXCLUDED_DOMAINS = [
  'wikipedia.org', 'facebook.com', 'twitter.com', 'linkedin.com',
  'youtube.com', 'instagram.com', 'amazon.com', 'reddit.com',
  'google.com', 'yelp.com', 'tripadvisor.com', 'crunchbase.com',
  'indeed.com', 'glassdoor.com', 'quora.com', 'medium.com'
]

export const isExcludedDomain = (url) => {
  return EXCLUDED_DOMAINS.some(domain => url.includes(domain))
}

// Get current usage stats
export const getSerperUsage = () => ({
  queriesUsed: totalQueriesUsed,
  freeLimit: 2500,
  remaining: Math.max(0, 2500 - totalQueriesUsed)
})
