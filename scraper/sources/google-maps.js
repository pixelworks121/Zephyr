import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

const MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY

// Search Google Maps Places API for businesses
// Returns array of business objects
export const searchGoogleMaps = async (keyword, location, options = {}) => {
  const { radius = 50000, type = '', maxResults = 20 } = options

  try {
    // Step 1: Text Search to find places
    const searchResponse = await axios.get(
      'https://maps.googleapis.com/maps/api/place/textsearch/json',
      {
        params: {
          query: `${keyword} in ${location}`,
          key: MAPS_API_KEY,
          ...(type && { type })
        }
      }
    )

    const places = searchResponse.data.results?.slice(0, maxResults) || []

    if (places.length === 0) {
      return { success: true, leads: [] }
    }

    // Step 2: Get details for each place
    const leads = await Promise.all(
      places.slice(0, 10).map(async (place) => {
        try {
          const detailResponse = await axios.get(
            'https://maps.googleapis.com/maps/api/place/details/json',
            {
              params: {
                place_id: place.place_id,
                fields: 'name,website,formatted_phone_number,formatted_address,rating,business_status,types,url',
                key: MAPS_API_KEY
              }
            }
          )

          const detail = detailResponse.data.result || {}

          return {
            companyName: place.name,
            website: detail.website || null,
            phone: detail.formatted_phone_number || null,
            address: detail.formatted_address || null,
            country: extractCountryFromAddress(detail.formatted_address || ''),
            rating: place.rating || null,
            industry: mapPlaceTypeToIndustry(place.types || []),
            source: 'AI_DISCOVERED',
            additionalInfo: `Found via Google Maps. Rating: ${place.rating || 'N/A'}. Address: ${detail.formatted_address || 'N/A'}`
          }
        } catch {
          return {
            companyName: place.name,
            website: null,
            source: 'AI_DISCOVERED',
            industry: mapPlaceTypeToIndustry(place.types || [])
          }
        }
      })
    )

    return { success: true, leads: leads.filter(l => l.companyName) }
  } catch (error) {
    console.error('[GoogleMaps] Error:', error.response?.data || error.message)
    return { success: false, leads: [], error: error.message }
  }
}

const extractCountryFromAddress = (address) => {
  if (!address) return null
  const parts = address.split(',')
  return parts[parts.length - 1]?.trim() || null
}

const mapPlaceTypeToIndustry = (types) => {
  const typeMap = {
    restaurant: 'Food & Beverage',
    food: 'Food & Beverage',
    store: 'Retail',
    clothing_store: 'Fashion & Retail',
    beauty_salon: 'Beauty & Wellness',
    gym: 'Health & Fitness',
    hospital: 'Healthcare',
    school: 'Education',
    real_estate_agency: 'Real Estate',
    travel_agency: 'Travel & Tourism',
    lawyer: 'Legal Services',
    accounting: 'Finance & Accounting',
    car_dealer: 'Automotive',
    lodging: 'Hospitality'
  }

  for (const type of types) {
    if (typeMap[type]) return typeMap[type]
  }
  return 'Local Business'
}

// Predefined location + industry combinations for discovery
export const DISCOVERY_TARGETS = [
  { keyword: 'digital marketing agency', location: 'Dubai', industry: 'Marketing' },
  { keyword: 'e-commerce store', location: 'London', industry: 'E-commerce' },
  { keyword: 'web design company', location: 'New York', industry: 'Tech' },
  { keyword: 'software startup', location: 'Singapore', industry: 'Tech' },
  { keyword: 'creative agency', location: 'Toronto', industry: 'Creative' },
  { keyword: 'online business', location: 'Sydney', industry: 'Business' },
  { keyword: 'tech company', location: 'Bangalore', industry: 'Tech' },
  { keyword: 'branding agency', location: 'Berlin', industry: 'Marketing' },
  { keyword: 'restaurant', location: 'Mumbai', industry: 'Food & Beverage' },
  { keyword: 'salon', location: 'Paris', industry: 'Beauty & Wellness' }
]
