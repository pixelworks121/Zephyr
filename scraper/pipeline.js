import { googleSearch, serperSearch, generateLeadSearchQueries, generateNeedBasedQueries, searchResultToLead, getSerperUsage } from './sources/google-search.js'
import { extractCompanyInfo } from './sources/browser-agent.js'
import { getProductHuntLeads } from './sources/product-hunt.js'
import { findPublicContactInfo } from './enrichment/public-contact.js'
import { smartHunterEnrich, getHunterUsage } from './enrichment/hunter.js'
import { smartApolloEnrich, getApolloUsage } from './enrichment/apollo.js'
import { filterQualityLeads, preScoreLead } from './filters/leadQualityFilter.js'
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

// ── DB-level deduplication ────────────────────────────────────────────────────
// Checks against leads ALREADY in the database (not just the current batch).
// Uses the prisma instance passed into the pipeline (no cross-package import).

const normalizeDomain = (website) => {
  if (!website) return null
  try {
    return website
      .replace('https://', '')
      .replace('http://', '')
      .replace('www.', '')
      .split('/')[0]
      .toLowerCase()
      .trim()
  } catch {
    return null
  }
}

const isAlreadyInDB = async (lead, prisma) => {
  if (!prisma) return false
  try {
    const domain = normalizeDomain(lead.website)
    if (domain) {
      const existing = await prisma.lead.findFirst({
        where: {
          OR: [
            { website: { contains: domain } },
            { companyName: { equals: lead.companyName, mode: 'insensitive' } }
          ]
        }
      })
      return !!existing
    }
    if (!lead.companyName) return false
    const existing = await prisma.lead.findFirst({
      where: { companyName: { equals: lead.companyName, mode: 'insensitive' } }
    })
    return !!existing
  } catch (e) {
    // Never block the pipeline if the DB check fails — log and treat as new.
    console.error('[Pipeline] DB dedup check failed (continuing):', e.message)
    return false
  }
}

// Filter out leads already present in the DB. Returns { leads, skipped }.
const filterNewLeadsOnly = async (leads, prisma) => {
  if (!prisma) return { leads, skipped: 0 }
  const results = []
  let skipped = 0
  for (const lead of leads) {
    const duplicate = await isAlreadyInDB(lead, prisma)
    if (!duplicate) {
      results.push(lead)
    } else {
      skipped++
      console.log(`[Pipeline] Skipping duplicate (already in DB): ${lead.companyName}`)
    }
  }
  return { leads: results, skipped }
}

// ── Source Runners ──────────────────────────────────────────────────────────

const runGoogleSearchDiscovery = async (options = {}) => {
  const {
    targetTypes = ['local', 'ecommerce', 'startup', 'service'],
    regions = [
      'India', 'UAE', 'UK', 'Canada', 'Australia',
      'Singapore', 'USA', 'South Africa', 'Nigeria', 'Philippines'
    ],
    queriesPerType = 1  // 1 query per type per region to conserve search quota
  } = options

  const leads = []
  console.log('[Pipeline] Starting targeted Google Search discovery...')

  // Standard targeted searches (small-to-medium businesses)
  for (const type of targetTypes) {
    for (const region of regions) {
      const queries = generateLeadSearchQueries(type, region).slice(0, queriesPerType)
      for (const query of queries) {
        try {
          const result = await serperSearch(query, { num: 10 })
          if (result.success) {
            leads.push(...result.results.filter(r => !isExcludedDomain(r.url)).map(searchResultToLead))
          }
        } catch (e) { console.error('[Pipeline] Search error:', e.message) }
        await sleep(500)
      }
    }
  }

  // Need-based searches (high intent — businesses signalling they need services)
  console.log('[Pipeline] Running need-based searches...')
  for (const query of generateNeedBasedQueries()) {
    try {
      const result = await serperSearch(query, { num: 10 })
      if (result.success) {
        leads.push(...result.results.filter(r => !isExcludedDomain(r.url)).map(searchResultToLead))
      }
    } catch (e) { console.error('[Pipeline] Need-based search error:', e.message) }
    await sleep(500)
  }

  console.log(`[Pipeline] Google Search found ${leads.length} raw leads before filtering`)
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

  // Step 2 — Deduplicate within this batch
  allLeads = deduplicateLeads(allLeads)
  console.log(`[Pipeline] After in-batch dedup: ${allLeads.length}`)

  // Step 3 — Quality filter (remove big companies + junk)
  const beforeQuality = allLeads.length
  allLeads = filterQualityLeads(allLeads)
  const bigCompaniesRemoved = beforeQuality - allLeads.length
  console.log(`[Pipeline] After quality filter: ${allLeads.length} (${bigCompaniesRemoved} removed)`)

  // Step 4 — Deduplicate against the database (skip leads we already have)
  const dbDedup = await filterNewLeadsOnly(allLeads, prisma)
  allLeads = dbDedup.leads
  const duplicatesSkipped = dbDedup.skipped
  console.log(`[Pipeline] After DB dedup: ${allLeads.length} (${duplicatesSkipped} already in DB)`)

  // Step 5 — Pre-score and sort (best leads first)
  allLeads = allLeads
    .map(lead => ({ ...lead, preScore: preScoreLead(lead) }))
    .sort((a, b) => b.preScore - a.preScore)

  // Step 6 — Limit to maxLeads (now sorted best-first)
  allLeads = allLeads.slice(0, maxLeads)
  console.log(`[Pipeline] Top ${allLeads.length} quality leads selected for processing`)

  // Step 7 — Public enrichment
  if (enrichPublic) {
    const enriched = []
    for (const lead of allLeads) {
      enriched.push(await enrichLeadPublic(lead))
      await sleep(800)
    }
    allLeads = enriched
  }

  // Step 8 — Paid enrichment (Hunter/Apollo)
  if (enrichPaidApis) {
    const enriched = []
    for (const lead of allLeads) { enriched.push(await enrichPaid(lead)) }
    allLeads = enriched
  }

  // Step 9 — Save to DB via Prisma (if provided)
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
    qualityFilterStats: {
      passedFilter: allLeads.length,
      note: 'Big companies and duplicates automatically removed'
    },
    withEmail: allLeads.filter(l => l.email).length,
    withWebsite: allLeads.filter(l => l.website).length,
    saved,
    skipped,
    duplicatesSkipped,
    bigCompaniesRemoved,
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
