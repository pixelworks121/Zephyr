// ── Big Company Blacklist ────────────────────────────────────────────────────
// These are established companies that would NEVER need Pixel Works services

const BLACKLISTED_COMPANIES = [
  // E-commerce giants
  'amazon', 'flipkart', 'shopify', 'ebay', 'etsy', 'alibaba', 'aliexpress',
  'meesho', 'myntra', 'snapdeal', 'ajio', 'nykaa', 'bigbasket', 'blinkit',
  'swiggy', 'zomato', 'dunzo',

  // Tech giants
  'google', 'facebook', 'meta', 'microsoft', 'apple', 'netflix', 'twitter',
  'instagram', 'youtube', 'linkedin', 'pinterest', 'tiktok', 'snapchat',
  'whatsapp', 'telegram', 'zoom', 'slack', 'notion', 'figma', 'canva',
  'adobe', 'salesforce', 'hubspot', 'mailchimp',

  // Indian big companies
  'tata', 'reliance', 'infosys', 'wipro', 'hcl', 'accenture', 'cognizant',
  'tech mahindra', 'capgemini', 'ibm', 'oracle', 'paytm', 'phonepe',
  'razorpay', 'zepto', 'ola', 'uber', 'rapido',

  // Global brands
  'nike', 'adidas', 'zara', 'h&m', 'ikea', 'samsung', 'sony', 'lg',
  'toyota', 'honda', 'bmw', 'mercedes', 'tesla',

  // Platforms (they ARE the platform)
  'wix', 'squarespace', 'wordpress', 'webflow', 'godaddy', 'hostinger',
  'bluehost', 'namecheap',

  // News & Media
  'bbc', 'cnn', 'times of india', 'ndtv', 'zee news', 'republic',
  'techcrunch', 'forbes', 'entrepreneur',

  // Job portals & directories
  'indeed', 'naukri', 'linkedin', 'glassdoor', 'monster', 'upwork',
  'fiverr', 'freelancer', 'toptal',

  // Review & directory sites
  'clutch', 'g2', 'capterra', 'trustpilot', 'justdial', 'sulekha',
  'tripadvisor', 'yelp', 'yellowpages',

  // Irrelevant
  'wikipedia', 'reddit', 'quora', 'medium', 'github', 'stackoverflow'
]

// ── Blacklisted Domains ──────────────────────────────────────────────────────

const BLACKLISTED_DOMAINS = [
  'amazon.com', 'amazon.in', 'flipkart.com', 'shopify.com', 'ebay.com',
  'google.com', 'facebook.com', 'meta.com', 'microsoft.com', 'apple.com',
  'netflix.com', 'twitter.com', 'instagram.com', 'youtube.com', 'linkedin.com',
  'wikipedia.org', 'reddit.com', 'medium.com', 'quora.com', 'github.com',
  'wordpress.com', 'wix.com', 'squarespace.com', 'webflow.com',
  'hubspot.com', 'salesforce.com', 'mailchimp.com', 'canva.com',
  'figma.com', 'notion.so', 'slack.com', 'zoom.us',
  'clutch.co', 'g2.com', 'capterra.com', 'trustpilot.com',
  'indeed.com', 'glassdoor.com', 'upwork.com', 'fiverr.com',
  'techcrunch.com', 'forbes.com', 'entrepreneur.com',
  'justdial.com', 'sulekha.com', 'tripadvisor.com', 'yelp.com',
  'paytm.com', 'phonepe.com', 'razorpay.com'
]

// ── Revenue/Size Signals That Indicate Too Big ───────────────────────────────

const TOO_BIG_SIGNALS = [
  'fortune 500', 'nasdaq', 'nyse', 'bse listed', 'nse listed',
  'publicly traded', 'series d', 'series e', 'series f',
  'unicorn', '$1 billion', '$10 billion', 'ipo',
  '10,000 employees', '50,000 employees', '100,000 employees'
]

// ── Ideal Client Signals (what we WANT to see) ───────────────────────────────

const IDEAL_CLIENT_SIGNALS = [
  // Size signals — small to medium
  'small business', 'startup', 'growing', 'founder', 'co-founder',
  'bootstrapped', 'family owned', 'local business', 'boutique',
  'independent', 'new launch', 'recently launched',

  // Digital need signals
  'no website', 'outdated website', 'need redesign', 'looking for developer',
  'seeking agency', 'hiring designer', 'need digital presence',

  // Industry fit signals
  'ecommerce', 'online store', 'digital marketing', 'agency',
  'consultant', 'freelancer', 'saas', 'app', 'mobile app',
  'restaurant', 'cafe', 'salon', 'gym', 'clinic', 'school',
  'coaching', 'real estate', 'photography', 'event planning'
]

// ── Main Filter Function ─────────────────────────────────────────────────────

export const isQualityLead = (lead) => {
  const name = (lead.companyName || '').toLowerCase()
  const website = (lead.website || '').toLowerCase()
  const snippet = (lead.snippet || '').toLowerCase()
  const description = (lead.additionalInfo || '').toLowerCase()
  const combined = `${name} ${snippet} ${description}`

  // Check 1 — Blacklisted company name
  for (const blacklisted of BLACKLISTED_COMPANIES) {
    if (name.includes(blacklisted)) {
      console.log(`[Filter] ❌ Blacklisted company: ${lead.companyName}`)
      return { pass: false, reason: `Blacklisted company: ${blacklisted}` }
    }
  }

  // Check 2 — Blacklisted domain
  for (const domain of BLACKLISTED_DOMAINS) {
    if (website.includes(domain)) {
      console.log(`[Filter] ❌ Blacklisted domain: ${website}`)
      return { pass: false, reason: `Blacklisted domain: ${domain}` }
    }
  }

  // Check 3 — Too big signals
  for (const signal of TOO_BIG_SIGNALS) {
    if (combined.includes(signal)) {
      console.log(`[Filter] ❌ Too big signal found: "${signal}" in ${lead.companyName}`)
      return { pass: false, reason: `Company too large: ${signal}` }
    }
  }

  // Check 4 — No company name
  if (!lead.companyName || lead.companyName.length < 2) {
    return { pass: false, reason: 'No valid company name' }
  }

  // Check 5 — Generic/useless results
  const genericNames = [
    'home', 'index', 'page', 'website', 'blog', 'news',
    'about', 'contact', 'login', 'signup', 'results'
  ]
  if (genericNames.includes(name.trim())) {
    return { pass: false, reason: 'Generic page name, not a real business' }
  }

  // Check 6 — Company name is just a domain
  if (name.includes('.com') || name.includes('.org') || name.includes('.net')) {
    // Allow if it's a real company name with domain
    if (name.split('.')[0].length < 3) {
      return { pass: false, reason: 'Not a real company name' }
    }
  }

  // ── Content / article / listicle detection ──────────────────────────────────
  // Search often returns blog posts, guides and listicles whose "title" is not a
  // business at all. These are not prospects — reject them.

  // Parse hostname + path from the URL.
  let host = '', path = ''
  if (website) {
    try {
      const u = new URL(website.startsWith('http') ? website : `https://${website}`)
      host = u.hostname.toLowerCase()
      path = u.pathname.toLowerCase()
    } catch {
      path = website
    }
  }

  // Check 7 — Government / education sites are never prospects
  if (/(^|\.)gov(\.[a-z]{2,})?(\/|$)/.test(host) || /\.edu(\.[a-z]{2,})?(\/|$)/.test(host) || host.endsWith('.gov') || host.endsWith('.edu') || host.includes('.gov.') || host.includes('.edu.')) {
    return { pass: false, reason: 'Government/education site, not a prospect' }
  }

  // Check 8 — Blog subdomain or content URL path (article, not a homepage)
  if (/^blogs?\./.test(host) || host.includes('.blog')) {
    return { pass: false, reason: 'Blog subdomain, not a business' }
  }
  const CONTENT_PATHS = [
    '/blog', '/article', '/guide', '/resource', '/content/', '/news', '/press',
    '/insight', '/case-stud', '/how-to', '/tutorial', '/whitepaper', '/ebook',
    '/glossary', '/wiki', '/learn/', '/knowledge'
  ]
  for (const p of CONTENT_PATHS) {
    if (path.includes(p)) {
      return { pass: false, reason: `Content/article URL (${p})` }
    }
  }

  // Check 9 — Listicle / guide / question style titles (not a company name)
  const trimmed = name.trim()
  if (/^\d+$/.test(trimmed)) {
    return { pass: false, reason: 'Numeric-only name' }
  }
  // "Top 12 ...", "12 best ...", "7 ways ..."
  if (/^(top\s+)?\d{1,3}\s+\w/.test(trimmed)) {
    return { pass: false, reason: 'Listicle title' }
  }
  const CONTENT_TITLE_PHRASES = [
    'how to', 'ultimate guide', 'complete guide', 'a guide', 'guide to', 'guide for',
    'what is', 'what are', 'why you', 'why your', 'step by step', 'step-by-step',
    'tutorial', 'best practices', 'everything you need', ' vs ', 'vs.', 'explained',
    'a complete', 'the complete', 'introduction to', 'beginner', 'checklist', 'faq'
  ]
  for (const ph of CONTENT_TITLE_PHRASES) {
    if (name.includes(ph)) {
      return { pass: false, reason: `Article-style title: "${ph.trim()}"` }
    }
  }
  // "best <X> companies/services/tools/software/agencies/platforms"
  if (/\bbest\b/.test(name) && /(compan|service|tool|software|agenc|platform|solution|app)/.test(name)) {
    return { pass: false, reason: 'Listicle title (best X companies/services)' }
  }

  return { pass: true, reason: 'Passed all quality checks' }
}

// Filter an array of leads — returns only quality leads
export const filterQualityLeads = (leads) => {
  const passed = []
  const rejected = []

  for (const lead of leads) {
    const result = isQualityLead(lead)
    if (result.pass) {
      passed.push(lead)
    } else {
      rejected.push({ lead: lead.companyName, reason: result.reason })
    }
  }

  console.log(`[Filter] Quality filter: ${passed.length} passed, ${rejected.length} rejected`)
  if (rejected.length > 0) {
    console.log('[Filter] Rejected:', rejected.map(r => `${r.lead} (${r.reason})`).join(', '))
  }

  return passed
}

// Score a lead's quality before AI analysis
// Returns a pre-score to prioritize which leads to analyze first
export const preScoreLead = (lead) => {
  let score = 5 // base score
  const combined = `${lead.companyName} ${lead.snippet || ''} ${lead.additionalInfo || ''}`.toLowerCase()

  // Boost score for ideal signals
  for (const signal of IDEAL_CLIENT_SIGNALS) {
    if (combined.includes(signal)) score += 0.5
  }

  // Boost for having contact info
  if (lead.email) score += 1
  if (lead.phone) score += 0.5
  if (lead.linkedinUrl) score += 0.5

  // Boost for having a website (they have some digital presence)
  if (lead.website) score += 0.5

  // Cap at 9 — full 10 is reserved for AI scoring
  return Math.min(9, score)
}
