const prisma = require('./prismaClient');

// The scraper package is ESM; load it from this CommonJS module via dynamic import.
let scraperPromise = null;
function loadScraper() {
  if (!scraperPromise) scraperPromise = import('@zephyr/scraper');
  return scraperPromise;
}

// Minimum Hunter confidence (0-100) to accept an email as authentic.
const MIN_EMAIL_CONFIDENCE = 50;

function domainFromWebsite(website) {
  if (!website) return null;
  try {
    return website.replace(/^https?:\/\//, '').replace('www.', '').split('/')[0] || null;
  } catch {
    return null;
  }
}

// Discover ONLY authentic contact details for a lead. No guessed/pattern emails.
//   1. Public website scrape — emails/phones the company itself published (authentic)
//   2. Hunter.io domain search — real emails, accepted only if confidence >= threshold
// If nothing authentic is found, the field stays empty (never fabricated).
async function findContactDetails(lead) {
  const result = {
    email: null,
    phone: null,
    contactName: null,
    linkedinUrl: null,
    twitterUrl: null,
    source: null,
    confidence: null,
  };

  if (!lead.website) return result;
  const domain = domainFromWebsite(lead.website);
  const scraper = await loadScraper();

  // 1. Public website scrape (free). Emails on the company's own site are authentic.
  //    Playwright may be unavailable in some hosts — never let that crash enrichment.
  try {
    const pub = await scraper.findPublicContactInfo(lead.website);
    if (pub && pub.success && pub.data) {
      if (pub.data.email) {
        result.email = pub.data.email;
        result.source = 'website';
        result.confidence = 100; // published on their own site
      }
      result.phone = pub.data.phone || null;
      result.linkedinUrl = pub.data.linkedinUrl || null;
      result.twitterUrl = pub.data.twitterUrl || null;
    }
  } catch (e) {
    // Playwright/browser unavailable — skip silently.
  }

  // 2. Hunter.io domain search — accept the top email only if confidence is high
  //    enough to be considered authentic. Conserve the free quota: only when we
  //    still have no email.
  if (!result.email && domain) {
    try {
      const h = await scraper.hunterDomainSearch(domain);
      if (h && h.success) {
        const top = (h.emails && h.emails[0]) || null;
        const confidence = top ? top.confidence : null;
        if (h.topEmail && confidence != null && confidence >= MIN_EMAIL_CONFIDENCE) {
          result.email = h.topEmail;
          result.source = 'hunter';
          result.confidence = confidence;
          if (!result.contactName && h.topContact && h.topContact.name) {
            result.contactName = h.topContact.name;
          }
        }
      }
    } catch (e) {
      // Hunter unavailable / quota exhausted — leave email empty (no fabrication).
    }
  }

  return result;
}

// Fill a lead's MISSING contact fields with authentic data only (never overwrites
// existing data, never fabricates). Returns { filled, found } or null. Never throws.
async function enrichLeadContact(leadId) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || !lead.website) return null;
    if (lead.email && lead.phone) return null; // already reachable

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
