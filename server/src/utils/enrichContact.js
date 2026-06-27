const prisma = require('./prismaClient');

// The scraper package is ESM; load it from this CommonJS module via dynamic import.
let scraperPromise = null;
function loadScraper() {
  if (!scraperPromise) scraperPromise = import('@zephyr/scraper');
  return scraperPromise;
}

function domainFromWebsite(website) {
  if (!website) return null;
  try {
    return website.replace(/^https?:\/\//, '').replace('www.', '').split('/')[0] || null;
  } catch {
    return null;
  }
}

// Discover contact details for a lead using (in order, cheapest/most-reliable first):
//   1. Public website scrape (free; Playwright — may be unavailable in some hosts)
//   2. Hunter.io domain search (HTTP; real email + contact name) — only for
//      higher-value leads to conserve the free 25/month quota
//   3. Generic email pattern (info@domain) as a last resort so there is always
//      something for an employee to contact
// Returns the fields that were found (nulls for the rest).
async function findContactDetails(lead) {
  const result = {
    email: null,
    phone: null,
    contactName: null,
    linkedinUrl: null,
    twitterUrl: null,
    source: null,
  };

  if (!lead.website) return result;
  const domain = domainFromWebsite(lead.website);
  const scraper = await loadScraper();

  // 1. Public website scrape (free). Playwright may not be installed in prod —
  //    never let that crash enrichment.
  try {
    const pub = await scraper.findPublicContactInfo(lead.website);
    if (pub && pub.success && pub.data) {
      result.email = result.email || pub.data.email || null;
      result.phone = result.phone || pub.data.phone || null;
      result.linkedinUrl = result.linkedinUrl || pub.data.linkedinUrl || null;
      result.twitterUrl = result.twitterUrl || pub.data.twitterUrl || null;
      if (pub.data.email) result.source = 'website';
    }
  } catch (e) {
    // Playwright/browser unavailable — skip silently.
  }

  // 2. Hunter.io domain search — only if we still have no email and the lead
  //    looks worth a credit (score >= 7), to protect the 25/month free quota.
  if (!result.email && domain && (lead.aiScore == null || lead.aiScore >= 7)) {
    try {
      const h = await scraper.hunterDomainSearch(domain);
      if (h && h.success) {
        if (h.topEmail) {
          result.email = h.topEmail;
          result.source = 'hunter';
        }
        if (!result.contactName && h.topContact && h.topContact.name) {
          result.contactName = h.topContact.name;
        }
      }
    } catch (e) {
      // Hunter unavailable / quota — skip.
    }
  }

  // 3. Last resort: a generic mailbox so employees always have a starting point.
  if (!result.email && domain) {
    try {
      const patterns = scraper.guessEmailPatterns(domain);
      if (patterns && patterns.length) {
        result.email = patterns[0]; // info@domain
        result.source = 'pattern';
      }
    } catch (e) {
      // ignore
    }
  }

  return result;
}

// Fill a lead's MISSING contact fields in the DB (never overwrites existing data).
// Returns { filled: [fields], found } or null. Never throws.
async function enrichLeadContact(leadId) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || !lead.website) return null;

    // Already has both an email and a phone — nothing to do.
    if (lead.email && lead.phone) return null;

    const found = await findContactDetails(lead);

    const data = {};
    if (!lead.email && found.email) data.email = found.email;
    if (!lead.phone && found.phone) data.phone = found.phone;
    if (!lead.contactName && found.contactName) data.contactName = found.contactName;
    if (!lead.linkedinUrl && found.linkedinUrl) data.linkedinUrl = found.linkedinUrl;
    if (!lead.twitterUrl && found.twitterUrl) data.twitterUrl = found.twitterUrl;

    if (Object.keys(data).length === 0) return null;

    await prisma.lead.update({ where: { id: leadId }, data });
    return { filled: Object.keys(data), found };
  } catch (e) {
    console.error(`[EnrichContact] Error for lead ${leadId}:`, e.message);
    return null;
  }
}

module.exports = { enrichLeadContact, findContactDetails };
