import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

const APOLLO_API_KEY = process.env.APOLLO_API_KEY
const APOLLO_BASE = 'https://api.apollo.io/v1'

let monthlyCreditsUsed = 0
const FREE_TIER_CREDIT_LIMIT = 50

export const apolloSearchPerson = async (companyName, website = null) => {
  if (!APOLLO_API_KEY) return { success: false, error: 'Apollo API key not configured' }
  if (monthlyCreditsUsed >= FREE_TIER_CREDIT_LIMIT) return { success: false, error: 'Apollo free tier monthly credit limit reached' }

  try {
    const domain = website ? website.replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0] : null

    const response = await axios.post(`${APOLLO_BASE}/mixed_people/search`, {
      api_key: APOLLO_API_KEY,
      q_organization_name: companyName,
      ...(domain && { q_organization_domains: [domain] }),
      person_titles: ['CEO', 'Founder', 'Co-Founder', 'Owner', 'Director', 'Manager', 'Marketing Manager', 'Head of Marketing', 'CMO', 'CTO'],
      page: 1, per_page: 3
    })

    monthlyCreditsUsed++
    const people = response.data.people || []

    return {
      success: true,
      people: people.map(p => ({
        name: p.name, firstName: p.first_name, lastName: p.last_name,
        email: p.email, title: p.title, linkedinUrl: p.linkedin_url,
        phone: p.phone_numbers?.[0]?.sanitized_number || null
      })),
      topContact: people[0] ? {
        name: people[0].name, email: people[0].email, title: people[0].title,
        linkedinUrl: people[0].linkedin_url, phone: people[0].phone_numbers?.[0]?.sanitized_number || null
      } : null,
      creditsUsed: monthlyCreditsUsed
    }
  } catch (error) {
    if (error.response?.status === 422) return { success: false, error: 'Apollo: Invalid search parameters' }
    if (error.response?.status === 401) return { success: false, error: 'Apollo API key invalid' }
    return { success: false, error: error.message }
  }
}

export const apolloEnrichCompany = async (domain) => {
  if (!APOLLO_API_KEY) return { success: false, error: 'Apollo API key not configured' }
  if (monthlyCreditsUsed >= FREE_TIER_CREDIT_LIMIT) return { success: false, error: 'Apollo free tier monthly credit limit reached' }

  try {
    const response = await axios.post(`${APOLLO_BASE}/organizations/enrich`, {
      api_key: APOLLO_API_KEY, domain: domain.replace('www.', '')
    })
    monthlyCreditsUsed++
    const org = response.data.organization || {}

    return {
      success: true,
      organization: {
        name: org.name, website: org.website_url, industry: org.industry,
        employeeCount: org.estimated_num_employees, country: org.country, city: org.city,
        description: org.short_description, linkedinUrl: org.linkedin_url, twitterUrl: org.twitter_url,
        foundedYear: org.founded_year, revenue: org.annual_revenue_printed,
        technologies: org.technologies?.slice(0, 10) || []
      }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export const smartApolloEnrich = async (lead, minScore = 8) => {
  if (lead.aiScore && lead.aiScore < minScore) return { success: false, skipped: true, reason: `Score ${lead.aiScore} below threshold ${minScore}` }
  return await apolloSearchPerson(lead.companyName, lead.website)
}

export const getApolloUsage = () => ({
  credits: { used: monthlyCreditsUsed, limit: FREE_TIER_CREDIT_LIMIT, remaining: FREE_TIER_CREDIT_LIMIT - monthlyCreditsUsed }
})
