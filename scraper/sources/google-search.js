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
// targetType: 'agency' | 'ecommerce' | 'startup' | 'local' | 'service' | 'outdated'
// Targeted at small-to-medium businesses that actually need digital services
// (not marketplaces / big brands).
export const generateLeadSearchQueries = (targetType, region = '') => {
  const r = region ? ` in ${region}` : ''

  const queryTemplates = {
    // Small agencies that need better websites/tools
    agency: [
      `small digital marketing agency${r} "our services"`,
      `boutique creative agency${r} portfolio website`,
      `local marketing consultant${r} website`,
      `freelance web designer${r} hire`,
      `small branding studio${r} clients`
    ],

    // Small ecommerce stores (not marketplaces)
    ecommerce: [
      `independent online store${r} handmade products`,
      `small ecommerce brand${r} shopify store`,
      `local products online store${r}`,
      `D2C brand${r} website`,
      `niche online shop${r} products`
    ],

    // Early stage startups
    startup: [
      `early stage startup${r} MVP launch`,
      `bootstrapped saas${r} product`,
      `new tech startup${r} founder`,
      `seed stage startup${r} app`,
      `indie hacker${r} product launch`
    ],

    // Local businesses with weak digital presence
    local: [
      `local restaurant${r} "order online"`,
      `beauty salon${r} "book appointment" website`,
      `local gym${r} fitness website membership`,
      `dental clinic${r} website appointment`,
      `photography studio${r} portfolio website`,
      `event planning company${r} website`,
      `coaching institute${r} website admission`,
      `interior designer${r} portfolio website`
    ],

    // Service businesses that need leads
    service: [
      `IT services company${r} small business`,
      `HR consulting firm${r} website`,
      `accounting firm${r} small business clients`,
      `legal services${r} small firm website`,
      `recruitment agency${r} website`
    ],

    // Businesses with outdated/no website
    outdated: [
      `"established in" local business${r} services`,
      `traditional business${r} going digital`,
      `small manufacturer${r} website products`,
      `family business${r} online presence`,
      `local shop${r} website contact`
    ]
  }

  return queryTemplates[targetType] || queryTemplates.local
}

// More targeted discovery — searches for businesses
// that specifically signal they NEED digital services
export const generateNeedBasedQueries = (region = '') => {
  const r = region ? ` ${region}` : ''
  return [
    `small business${r} needs website redesign`,
    `startup${r} looking for web developer`,
    `local business${r} digital marketing help`,
    `ecommerce store${r} improve online sales`,
    `company${r} needs mobile app development`,
    `business${r} hire UI UX designer`,
    `startup${r} branding logo design`,
    `small agency${r} white label development`
  ]
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
