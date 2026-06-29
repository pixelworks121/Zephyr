const axios = require('axios');
const prisma = require('./prismaClient');

// The scraper package is ESM; load it from this CommonJS module via dynamic import.
let scraperPromise = null;
function loadScraper() {
  if (!scraperPromise) scraperPromise = import('@zephyr/scraper');
  return scraperPromise;
}

// Minimum Hunter confidence (0-100) to accept an email as authentic.
const MIN_EMAIL_CONFIDENCE = 50;

// Junk/provider emails we never want to store as a "contact".
const EMAIL_BLOCKLIST = /(sentry|wixpress|example\.com|\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg|@2x|domain\.com|email\.com|yourdomain|sentry\.io|wordpress\.com|impallari|fontawesome|googleapis|gstatic|jsdelivr|cloudflare|w3\.org|schema\.org|cdn\.|@sentry|noreply@|no-reply@)/i;

function domainFromWebsite(website) {
  if (!website) return null;
  try {
    return website.replace(/^https?:\/\//, '').replace('www.', '').split('/')[0] || null;
  } catch {
    return null;
  }
}

// Lightweight HTTP scrape (no browser) — fetches the site HTML and extracts
// emails / phones / social links the company published. Works anywhere
// (including Render), unlike the Playwright-based scraper. Authentic by nature
// (the data is on the company's own site).
async function httpScrapeContact(website) {
  const result = { email: null, phone: null, linkedinUrl: null, twitterUrl: null };
  const domain = domainFromWebsite(website);
  const url = website.startsWith('http') ? website : `https://${website}`;

  const fetchHtml = async (target) => {
    const res = await axios.get(target, {
      timeout: 10000,
      maxRedirects: 5,
      maxContentLength: 3_000_000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZephyrBot/1.0)' },
      validateStatus: (s) => s >= 200 && s < 400,
    });
    return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  };

  let html = '';
  try {
    html = await fetchHtml(url);
  } catch {
    return result;
  }

  // Also try a /contact page for better hit-rate (best-effort).
  try {
    const contactUrl = new URL('/contact', url).href;
    html += '\n' + (await fetchHtml(contactUrl));
  } catch {
    /* no contact page — fine */
  }

  // Emails — only trust mailto: links and same-domain addresses. Random
  // free-provider emails found in raw text/CSS (e.g. font license author emails)
  // are NOT trusted unless they appear in a mailto link.
  const isValid = (e) => e.length < 60 && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(e) && !EMAIL_BLOCKLIST.test(e);
  const mailtos = [...html.matchAll(/mailto:([^"'?>\s]+@[^"'?>\s]+)/gi)]
    .map((m) => m[1].trim().toLowerCase()).filter(isValid);
  const raws = [...html.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)]
    .map((m) => m[0].trim().toLowerCase()).filter(isValid);

  const sameDomainMailto = domain ? mailtos.find((e) => e.endsWith('@' + domain)) : null;
  const sameDomainRaw = domain ? raws.find((e) => e.endsWith('@' + domain)) : null;
  const anyMailto = mailtos[0] || null; // user explicitly published it as a contact link
  result.email = sameDomainMailto || sameDomainRaw || anyMailto || null;

  // Phone from tel: links
  const tel = [...html.matchAll(/tel:([+0-9()\-\s.]{7,20})/gi)].map((m) => m[1].trim());
  if (tel.length) result.phone = tel[0];

  // Social links
  const li = html.match(/https?:\/\/[a-z]*\.?linkedin\.com\/(company|in)\/[^"'\s)]+/i);
  if (li) result.linkedinUrl = li[0];
  const tw = html.match(/https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[A-Za-z0-9_]{2,}/i);
  if (tw) result.twitterUrl = tw[0];

  return result;
}

// Discover ONLY authentic contact details for a lead. No guessed/pattern emails.
//   1. HTTP scrape of the company's own website (works in prod) — authentic
//   2. Playwright scrape (richer, only where a browser is available) — best-effort
//   3. Hunter.io domain search — accepted only if confidence >= threshold
// If nothing authentic is found, the field stays empty (never fabricated).
async function findContactDetails(lead) {
  const result = {
    email: null, phone: null, contactName: null,
    linkedinUrl: null, twitterUrl: null, source: null, confidence: null,
  };

  if (!lead.website) return result;
  const domain = domainFromWebsite(lead.website);

  // 1. HTTP scrape (no browser — works on Render)
  try {
    const s = await httpScrapeContact(lead.website);
    if (s.email) { result.email = s.email; result.source = 'website'; result.confidence = 100; }
    result.phone = result.phone || s.phone;
    result.linkedinUrl = result.linkedinUrl || s.linkedinUrl;
    result.twitterUrl = result.twitterUrl || s.twitterUrl;
  } catch { /* ignore */ }

  // 2. Playwright scrape (best-effort; only adds value where a browser exists)
  if (!result.email || !result.phone) {
    try {
      const scraper = await loadScraper();
      const pub = await scraper.findPublicContactInfo(lead.website);
      if (pub && pub.success && pub.data) {
        if (!result.email && pub.data.email) { result.email = pub.data.email; result.source = 'website'; result.confidence = 100; }
        result.phone = result.phone || pub.data.phone || null;
        result.linkedinUrl = result.linkedinUrl || pub.data.linkedinUrl || null;
        result.twitterUrl = result.twitterUrl || pub.data.twitterUrl || null;
      }
    } catch { /* Playwright unavailable — fine */ }
  }

  // 3. Hunter.io domain search — only if we still have no email; accept on confidence.
  if (!result.email && domain) {
    try {
      const scraper = await loadScraper();
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
    } catch { /* Hunter unavailable / quota — leave empty (no fabrication) */ }
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
