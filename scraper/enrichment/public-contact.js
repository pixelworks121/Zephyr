import { extractCompanyInfo } from '../sources/browser-agent.js'

// Try to find contact info from a company's website without using paid APIs
export const findPublicContactInfo = async (website) => {
  if (!website) return { success: false, data: null }

  try {
    // Normalize URL
    const url = website.startsWith('http') ? website : `https://${website}`

    const result = await extractCompanyInfo(url, { extractContact: true })

    if (!result.success) {
      return { success: false, data: null, error: result.error }
    }

    return {
      success: true,
      data: {
        email: result.data.email,
        phone: result.data.phone,
        allEmails: result.data.allEmails,
        allPhones: result.data.allPhones,
        linkedinUrl: result.data.linkedinUrl,
        twitterUrl: result.data.twitterUrl
      }
    }
  } catch (error) {
    return { success: false, data: null, error: error.message }
  }
}

// Guess common email patterns for a domain
// e.g. domain = "pixelworks.com" → tries info@, hello@, contact@, etc.
export const guessEmailPatterns = (domain, contactName = null) => {
  const cleanDomain = domain.replace('www.', '')
  const patterns = [
    `info@${cleanDomain}`,
    `hello@${cleanDomain}`,
    `contact@${cleanDomain}`,
    `admin@${cleanDomain}`,
    `team@${cleanDomain}`
  ]

  if (contactName) {
    const nameParts = contactName.toLowerCase().trim().split(' ')
    if (nameParts.length >= 2) {
      patterns.unshift(
        `${nameParts[0]}@${cleanDomain}`,
        `${nameParts[0]}.${nameParts[1]}@${cleanDomain}`,
        `${nameParts[0][0]}${nameParts[1]}@${cleanDomain}`
      )
    }
  }

  return patterns
}
