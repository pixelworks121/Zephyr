import { chromium } from 'playwright'

// Visit a website and extract company/contact information
export const extractCompanyInfo = async (url, options = {}) => {
  const { timeout = 15000, extractContact = true } = options

  let browser = null

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    })

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })

    const page = await context.newPage()
    await page.setDefaultTimeout(timeout)

    // Visit main page
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout })

    // Extract basic info from main page
    const mainPageData = await page.evaluate(() => {
      const getMetaContent = (name) => {
        const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
        return el?.getAttribute('content') || null
      }

      return {
        title: document.title,
        description: getMetaContent('description') || getMetaContent('og:description'),
        ogSiteName: getMetaContent('og:site_name'),
        emails: [...document.querySelectorAll('a[href^="mailto:"]')]
          .map(el => el.href.replace('mailto:', '').split('?')[0])
          .filter(e => e.includes('@')),
        phones: [...document.querySelectorAll('a[href^="tel:"]')]
          .map(el => el.href.replace('tel:', '')),
        linkedIn: [...document.querySelectorAll('a[href*="linkedin.com"]')]
          .map(el => el.href)?.[0] || null,
        twitter: [...document.querySelectorAll('a[href*="twitter.com"], a[href*="x.com"]')]
          .map(el => el.href)?.[0] || null,
        instagram: [...document.querySelectorAll('a[href*="instagram.com"]')]
          .map(el => el.href)?.[0] || null
      }
    })

    let contactPageData = {}

    // Try to visit /contact page
    if (extractContact) {
      try {
        const contactUrl = new URL('/contact', url).href
        await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 8000 })

        contactPageData = await page.evaluate(() => {
          return {
            emails: [...document.querySelectorAll('a[href^="mailto:"]')]
              .map(el => el.href.replace('mailto:', '').split('?')[0])
              .filter(e => e.includes('@')),
            phones: [...document.querySelectorAll('a[href^="tel:"]')]
              .map(el => el.href.replace('tel:', '')),
            bodyText: document.body.innerText?.substring(0, 500)
          }
        })
      } catch {
        // Contact page might not exist — that's fine
      }
    }

    // Merge data — prefer contact page emails over main page
    const allEmails = [...new Set([...contactPageData.emails || [], ...mainPageData.emails])]
    const allPhones = [...new Set([...contactPageData.phones || [], ...mainPageData.phones])]

    // Extract company name from title or og:site_name
    const companyName = mainPageData.ogSiteName ||
      mainPageData.title?.split('|')[0]?.split('-')[0]?.trim() ||
      new URL(url).hostname.replace('www.', '')

    return {
      success: true,
      data: {
        companyName,
        website: url,
        description: mainPageData.description,
        email: allEmails[0] || null,
        phone: allPhones[0] || null,
        linkedinUrl: mainPageData.linkedIn,
        twitterUrl: mainPageData.twitter,
        instagramUrl: mainPageData.instagram,
        allEmails,
        allPhones
      }
    }
  } catch (error) {
    console.error(`[BrowserAgent] Error visiting ${url}:`, error.message)
    return {
      success: false,
      data: null,
      error: error.message
    }
  } finally {
    if (browser) await browser.close()
  }
}

// Check if a website looks like it needs digital services
// Returns a quick quality signal before deep analysis
export const quickWebsiteAudit = async (url) => {
  let browser = null

  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
    const context = await browser.newContext()
    const page = await context.newPage()

    const startTime = Date.now()
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 })
    const loadTime = Date.now() - startTime

    const auditData = await page.evaluate(() => {
      return {
        hasMeta: !!document.querySelector('meta[name="description"]'),
        hasViewport: !!document.querySelector('meta[name="viewport"]'),
        imageCount: document.querySelectorAll('img').length,
        hasContactForm: !!document.querySelector('form'),
        isMobileResponsive: !!document.querySelector('meta[name="viewport"]'),
        hasSSL: window.location.protocol === 'https:',
        pageTitle: document.title?.length || 0,
        h1Count: document.querySelectorAll('h1').length
      }
    })

    // Score the website quality (lower = more room for improvement = better lead)
    const issues = []
    if (!auditData.hasMeta) issues.push('Missing meta description')
    if (!auditData.hasViewport) issues.push('Not mobile responsive')
    if (!auditData.hasSSL) issues.push('No SSL certificate')
    if (loadTime > 5000) issues.push('Slow load time')
    if (auditData.h1Count === 0) issues.push('Missing H1 tags')

    return {
      success: true,
      loadTime,
      issues,
      needsWork: issues.length >= 2,
      auditData
    }
  } catch (error) {
    return { success: false, error: error.message, needsWork: true }
  } finally {
    if (browser) await browser.close()
  }
}
