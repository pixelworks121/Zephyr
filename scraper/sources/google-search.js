import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY
const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID

// Search Google Custom Search API
// Returns array of { title, url, snippet, displayLink }
export const googleSearch = async (query, options = {}) => {
  const { num = 10, start = 1 } = options

  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: GOOGLE_API_KEY,
        cx: SEARCH_ENGINE_ID,
        q: query,
        num: Math.min(num, 10), // Google max is 10 per request
        start
      }
    })

    const items = response.data.items || []
    return {
      success: true,
      results: items.map(item => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        displayLink: item.displayLink
      })),
      totalResults: response.data.searchInformation?.totalResults || 0
    }
  } catch (error) {
    console.error('[GoogleSearch] Error:', error.response?.data || error.message)
    return { success: false, results: [], error: error.message }
  }
}

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
      `dropshipping store${regionSuffix}`,
      `shopify store${regionSuffix} products`,
      `woocommerce store${regionSuffix}`
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

// Extract a domain/company name from a search result URL
export const extractDomainFromUrl = (url) => {
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    return domain
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
