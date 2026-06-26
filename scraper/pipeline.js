import { googleSearch, generateLeadSearchQueries, searchResultToLead, getSerperUsage } from './sources/google-search.js'
import { extractCompanyInfo } from './sources/browser-agent.js'
import { getProductHuntLeads } from './sources/product-hunt.js'
import { findPublicContactInfo } from './enrichment/public-contact.js'
import { smartHunterEnrich, getHunterUsage } from './enrichment/hunter.js'
import { smartApolloEnrich, getApolloUsage } from './enrichment/apollo.js'
import dotenv from 'dotenv'
dotenv.config()

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// ── Utility ─────────────────────────────────────────────────────────────────

export const deduplicateLeads = (leads) => {
  const seen = new Set()
  return leads.filter(lead => {
    let key
    try {
      key = lead.website
        ? new URL(lead.website.startsWith('http') ? lead.website : `https://${lead.website}`).hostname.replace('www.', '')
        : lead.companyName.toLowerCase().trim()
    } catch {
      key = lead.companyName.toLowerCase().trim()
    }
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const EXCLUDED_DOMAINS = [
  'wikipedia.org', 'facebook.com', 'twitter.com', 'linkedin.com',
  'youtube.com', 'instagram.com', 'amazon.com', 'reddit.com',
  'google.com', 'yelp.com', 'tripadvisor.com', 'crunchbase.com'
]

export const isExcludedDomain = (url) => EXCLUDED_DOMAINS.some(d => url.includes(d))

// ── Source Runners ──────────────────────────────────────────────────────────

const runGoogleSearchDiscovery = async (options = {}) => {
  const { targetTypes = ['agency', 'ecommerce', 'startup'], regions = ['India', 'UAE', 'UK'], queriesPerType = 2 } = options
  const leads = []
  for (const type of targetTypes) {
    for (const region of regions) {
      const queries = generateLeadSearchQueries(type, region).slice(0, queriesPerType)
      for (const query of queries) {
        try {
          const result = await googleSearch(query)
          if (result.success) {
            leads.push(...result.results.filter(r => !isExcludedDomain(r.url)).map(searchResultToLead))
          }
        } catch (e) { console.error('[Pipeline] Google search error:', e.message) }
        await sleep(500)
      }
    }
  }
  return leads
}

const runProductHuntDiscovery = async () => {
  try {
    const result = await getProductHuntLeads({ limit: 15 })
    return result.success ? result.leads : []
  } catch { return [] }
}

// ── Enrichment ──────────────────────────────────────────────────────────────

const enrichLeadPublic = async (lead) => {
  if (!lead.website || lead.email) return lead
  try {
    const r = await findPublicContactInfo(lead.website)
    if (r.success && r.data) {
      return { ...lead, email: lead.email || r.data.email, phone: lead.phone || r.data.phone, linkedinUrl: lead.linkedinUrl || r.data.linkedinUrl, twitterUrl: lead.twitterUrl || r.data.twitterUrl }
    }
  } catch {}
  return lead
}

const enrichPaid = async (lead) => {
  const enriched = { ...lead }
  if (!enriched.email && enriched.website) {
    try {
      const h = await smartHunterEnrich(enriched, 7)
      if (h.success && h.topContact) { enriched.email = h.topContact.email; enriched.contactName = enriched.contactName || h.topContact.name }
    } catch {}
    await sleep(500)
  }
  try {
    const a = await smartApolloEnrich(enriched, 8)
    if (a.success && a.topContact) {
      enriched.email = enriched.email || a.topContact.email
      enriched.contactName = enriched.contactName || a.topContact.name
      enriched.phone = enriched.phone || a.topContact.phone
      enriched.linkedinUrl = enriched.linkedinUrl || a.topContact.linkedinUrl
    }
  } catch {}
  return enriched
}

// ── Main Pipeline ───────────────────────────────────────────────────────────

export const runDiscoveryPipeline = async (options = {}) => {
  const {
    sources = ['google', 'producthunt'],
    enrichPublic = true,
    enrichPaidApis = false,
    saveToServer = false,
    maxLeads = 50,
    prisma = null          // Optional: if provided, saves directly to DB
  } = options

  console.log('[Pipeline] Starting Zephyr Discovery Pipeline')
  const startTime = Date.now()
  let allLeads = []

  // Step 1 — Discover
  if (sources.includes('google')) allLeads.push(...await runGoogleSearchDiscovery())
  if (sources.includes('producthunt')) allLeads.push(...await runProductHuntDiscovery())

  console.log(`[Pipeline] Raw leads: ${allLeads.length}`)

  // Step 2 — Deduplicate + limit
  allLeads = deduplicateLeads(allLeads).slice(0, maxLeads)
  console.log(`[Pipeline] After dedup: ${allLeads.length}`)

  // Step 3 — Public enrichment
  if (enrichPublic) {
    const enriched = []
    for (const lead of allLeads) {
      enriched.push(await enrichLeadPublic(lead))
      await sleep(800)
    }
    allLeads = enriched
  }

  // Step 4 — Paid enrichment (Hunter/Apollo)
  if (enrichPaidApis) {
    const enriched = []
    for (const lead of allLeads) { enriched.push(await enrichPaid(lead)) }
    allLeads = enriched
  }

  // Step 5 — Save to DB via Prisma (if provided)
  let saved = 0, skipped = 0
  if (prisma) {
    for (const lead of allLeads) {
      try {
        const website = lead.website ? lead.website.split('?')[0] : null
        if (!website) { skipped++; continue }
        const existing = await prisma.lead.findFirst({ where: { website } })
        if (existing) { skipped++; continue }
        await prisma.lead.create({
          data: {
            companyName: lead.companyName || 'Unknown',
            website, industry: lead.industry || null, country: lead.country || null,
            contactName: lead.contactName || null, email: lead.email || null,
            phone: lead.phone || null, linkedinUrl: lead.linkedinUrl || null,
            twitterUrl: lead.twitterUrl || null, source: 'AI_DISCOVERED', status: 'NEW_LEAD'
          }
        })
        saved++
      } catch (e) {
        if (e.code === 'P2002') skipped++
        else console.error('[Pipeline] Save error:', e.message)
      }
    }
    console.log(`[Pipeline] Saved ${saved}, skipped ${skipped}`)
  }

  const summary = {
    success: true,
    duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    leadsDiscovered: allLeads.length,
    withEmail: allLeads.filter(l => l.email).length,
    withWebsite: allLeads.filter(l => l.website).length,
    saved, skipped,
    serperUsage: getSerperUsage(),
    hunterUsage: getHunterUsage(),
    apolloUsage: getApolloUsage(),
    completedAt: new Date().toISOString()
  }

  console.log('[Pipeline] Complete:', JSON.stringify(summary))
  return { summary, leads: allLeads }
}

// Single-query helper (used by scheduler and index)
export const discoverLeadsFromSearch = async (query) => {
  const result = await googleSearch(query)
  if (!result.success) return []
  return result.results.filter(r => !isExcludedDomain(r.url)).map(searchResultToLead)
}

// Re-exports for convenience
export { getProductHuntLeads }
