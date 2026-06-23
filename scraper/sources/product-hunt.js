import axios from 'axios'

// Fetch today's top products from Product Hunt (public API, no auth needed for basic)
export const getProductHuntLeads = async (options = {}) => {
  const { limit = 20 } = options

  try {
    // Product Hunt GraphQL API
    const query = `
      {
        posts(first: ${limit}, order: VOTES) {
          edges {
            node {
              id
              name
              tagline
              description
              website
              votesCount
              topics {
                edges { node { name } }
              }
              makers {
                name
              }
            }
          }
        }
      }
    `

    const response = await axios.post('https://api.producthunt.com/v2/api/graphql',
      { query },
      {
        headers: {
          'Authorization': `Bearer ${process.env.PRODUCT_HUNT_TOKEN || ''}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const posts = response.data?.data?.posts?.edges || []

    return {
      success: true,
      leads: posts.map(({ node }) => ({
        companyName: node.name,
        website: node.website || `https://www.producthunt.com/posts/${node.id}`,
        industry: node.topics?.edges?.[0]?.node?.name || 'Tech',
        contactName: node.makers?.[0]?.name || null,
        description: node.tagline,
        source: 'AI_DISCOVERED',
        additionalInfo: `Product Hunt listing. Tagline: ${node.tagline}. Votes: ${node.votesCount}`
      }))
    }
  } catch (error) {
    console.error('[ProductHunt] Error:', error.message)

    // Fallback: return empty if Product Hunt token not configured
    return {
      success: false,
      leads: [],
      error: 'Product Hunt API unavailable — configure PRODUCT_HUNT_TOKEN'
    }
  }
}
