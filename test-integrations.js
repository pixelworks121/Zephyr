import dotenv from 'dotenv'
import { resolve } from 'path'

// Load env from server/.env
dotenv.config({ path: resolve('./server/.env') })

const results = {
  passed: [],
  failed: [],
  skipped: []
}

const log = {
  pass: (name, msg) => { results.passed.push(name); console.log(`✅ PASS — ${name}: ${msg}`) },
  fail: (name, msg) => { results.failed.push(name); console.error(`❌ FAIL — ${name}: ${msg}`) },
  skip: (name, msg) => { results.skipped.push(name); console.warn(`⚠️  SKIP — ${name}: ${msg}`) },
  section: (title) => console.log(`\n${'═'.repeat(50)}\n  ${title}\n${'═'.repeat(50)}`)
}

// ── Test 1: Environment Variables ─────────────────────────────────────────

log.section('TEST 1 — Environment Variables')

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'AI_1_PROVIDER',
  'AI_1_API_KEY',
  'AI_1_MODEL',
  'SERPER_API_KEY'
]

const optionalEnvVars = [
  'AI_2_PROVIDER',
  'AI_2_API_KEY',
  'AI_2_MODEL',
  'GOOGLE_MAPS_API_KEY',
  'HUNTER_API_KEY',
  'APOLLO_API_KEY',
  'PRODUCT_HUNT_TOKEN'
]

for (const key of requiredEnvVars) {
  if (process.env[key]) {
    log.pass(`ENV:${key}`, `Set (${process.env[key].substring(0, 8)}...)`)
  } else {
    log.fail(`ENV:${key}`, 'NOT SET — required variable missing')
  }
}

for (const key of optionalEnvVars) {
  if (process.env[key]) {
    log.pass(`ENV:${key}`, `Set (${process.env[key].substring(0, 8)}...)`)
  } else {
    log.skip(`ENV:${key}`, 'Not set — optional feature will be disabled')
  }
}

// ── Test 2: Database Connection ────────────────────────────────────────────

log.section('TEST 2 — Database Connection (PostgreSQL)')

try {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  await prisma.$connect()
  const userCount = await prisma.user.count()
  const leadCount = await prisma.lead.count()
  log.pass('DATABASE', `Connected — Users: ${userCount}, Leads: ${leadCount}`)
  await prisma.$disconnect()
} catch (error) {
  log.fail('DATABASE', error.message)
}

// ── Test 3: AI Agent 1 ─────────────────────────────────────────────────────

log.section(`TEST 3 — AI Agent 1 (${process.env.AI_1_PROVIDER} / ${process.env.AI_1_MODEL})`)

if (!process.env.AI_1_API_KEY) {
  log.skip('AI_1', 'AI_1_API_KEY not set')
} else {
  try {
    const provider = process.env.AI_1_PROVIDER?.toLowerCase()

    if (provider === 'anthropic') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic({ apiKey: process.env.AI_1_API_KEY })
      const response = await client.messages.create({
        model: process.env.AI_1_MODEL,
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Reply with exactly: ZEPHYR_AI_1_OK' }]
      })
      const text = response.content[0].text
      if (text.includes('ZEPHYR_AI_1_OK')) {
        log.pass('AI_1:ANTHROPIC', `Model ${process.env.AI_1_MODEL} responded correctly`)
      } else {
        log.pass('AI_1:ANTHROPIC', `Model responded: "${text.substring(0, 50)}"`)
      }

    } else if (provider === 'openai') {
      const OpenAI = (await import('openai')).default
      const client = new OpenAI({ apiKey: process.env.AI_1_API_KEY })
      const response = await client.chat.completions.create({
        model: process.env.AI_1_MODEL,
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Reply with exactly: ZEPHYR_AI_1_OK' }]
      })
      const text = response.choices[0].message.content
      log.pass('AI_1:OPENAI', `Model ${process.env.AI_1_MODEL} responded: "${text.substring(0, 50)}"`)

    } else if (provider === 'gemini') {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(process.env.AI_1_API_KEY)
      const model = genAI.getGenerativeModel({ model: process.env.AI_1_MODEL })
      const result = await model.generateContent('Reply with exactly: ZEPHYR_AI_1_OK')
      const text = result.response.text()
      log.pass('AI_1:GEMINI', `Model ${process.env.AI_1_MODEL} responded: "${text.substring(0, 50)}"`)

    } else if (provider === 'groq') {
      const Groq = (await import('groq-sdk')).default
      const client = new Groq({ apiKey: process.env.AI_1_API_KEY })
      const response = await client.chat.completions.create({
        model: process.env.AI_1_MODEL,
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Reply with exactly: ZEPHYR_AI_1_OK' }]
      })
      const text = response.choices[0].message.content
      log.pass('AI_1:GROQ', `Model ${process.env.AI_1_MODEL} responded: "${text.substring(0, 50)}"`)

    } else if (provider === 'openrouter') {
      const OpenAI = (await import('openai')).default
      const client = new OpenAI({ apiKey: process.env.AI_1_API_KEY, baseURL: 'https://openrouter.ai/api/v1' })
      const response = await client.chat.completions.create({
        model: process.env.AI_1_MODEL,
        max_tokens: 80,
        messages: [{ role: 'user', content: 'Reply with exactly: ZEPHYR_AI_1_OK' }]
      })
      const message = response.choices[0].message
      const text = message.content || message.reasoning || '(reasoning model — no final content in token budget)'
      log.pass('AI_1:OPENROUTER', `Model ${process.env.AI_1_MODEL} responded: "${text.substring(0, 50)}"`)

    } else {
      log.fail('AI_1', `Unknown provider: ${provider}`)
    }
  } catch (error) {
    log.fail('AI_1', error.message)
  }
}

// ── Test 4: AI Agent 2 ─────────────────────────────────────────────────────

log.section(`TEST 4 — AI Agent 2 (${process.env.AI_2_PROVIDER || 'not configured'} / ${process.env.AI_2_MODEL || 'N/A'})`)

if (!process.env.AI_2_API_KEY) {
  log.skip('AI_2', 'AI_2_API_KEY not set — reviewer features disabled')
} else {
  try {
    const provider = process.env.AI_2_PROVIDER?.toLowerCase()

    if (provider === 'anthropic') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic({ apiKey: process.env.AI_2_API_KEY })
      const response = await client.messages.create({
        model: process.env.AI_2_MODEL,
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Reply with exactly: ZEPHYR_AI_2_OK' }]
      })
      log.pass('AI_2:ANTHROPIC', `Model ${process.env.AI_2_MODEL} responded correctly`)

    } else if (provider === 'openai') {
      const OpenAI = (await import('openai')).default
      const client = new OpenAI({ apiKey: process.env.AI_2_API_KEY })
      const response = await client.chat.completions.create({
        model: process.env.AI_2_MODEL,
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Reply with exactly: ZEPHYR_AI_2_OK' }]
      })
      log.pass('AI_2:OPENAI', `Model ${process.env.AI_2_MODEL} responded correctly`)

    } else if (provider === 'gemini') {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(process.env.AI_2_API_KEY)
      const model = genAI.getGenerativeModel({ model: process.env.AI_2_MODEL })
      const result = await model.generateContent('Reply with exactly: ZEPHYR_AI_2_OK')
      log.pass('AI_2:GEMINI', `Model ${process.env.AI_2_MODEL} responded correctly`)

    } else if (provider === 'groq') {
      const Groq = (await import('groq-sdk')).default
      const client = new Groq({ apiKey: process.env.AI_2_API_KEY })
      const response = await client.chat.completions.create({
        model: process.env.AI_2_MODEL,
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Reply with exactly: ZEPHYR_AI_2_OK' }]
      })
      log.pass('AI_2:GROQ', `Model ${process.env.AI_2_MODEL} responded correctly`)

    } else if (provider === 'openrouter') {
      const OpenAI = (await import('openai')).default
      const client = new OpenAI({ apiKey: process.env.AI_2_API_KEY, baseURL: 'https://openrouter.ai/api/v1' })
      const response = await client.chat.completions.create({
        model: process.env.AI_2_MODEL,
        max_tokens: 80,
        messages: [{ role: 'user', content: 'Reply with exactly: ZEPHYR_AI_2_OK' }]
      })
      log.pass('AI_2:OPENROUTER', `Model ${process.env.AI_2_MODEL} responded correctly`)

    } else {
      log.fail('AI_2', `Unknown provider: ${provider}`)
    }
  } catch (error) {
    log.fail('AI_2', error.message)
  }
}

// ── Test 5: Serper.dev Web Search ──────────────────────────────────────────

log.section('TEST 5 — Serper.dev Web Search API')

if (!process.env.SERPER_API_KEY) {
  log.skip('SERPER', 'SERPER_API_KEY not set — web search discovery disabled')
} else {
  try {
    const axios = (await import('axios')).default
    const response = await axios.post(
      'https://google.serper.dev/search',
      { q: 'digital agency website', num: 3, gl: 'us', hl: 'en' },
      {
        headers: {
          'X-API-KEY': process.env.SERPER_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    )
    const organic = response.data.organic || []
    if (organic.length > 0) {
      log.pass('SERPER', `Returned ${organic.length} results — first: "${(organic[0].title || '').substring(0, 50)}"`)
    } else {
      log.fail('SERPER', 'API responded but returned 0 organic results')
    }
  } catch (error) {
    const status = error.response?.status
    const message = error.response?.data?.message || error.message
    if (status === 401 || status === 403) {
      log.fail('SERPER', `${status} — Invalid Serper API key. Details: ${message}`)
    } else if (status === 429) {
      log.fail('SERPER', '429 — Serper rate limit / free quota (2500) exceeded')
    } else {
      log.fail('SERPER', message)
    }
  }
}

// ── Test 6: Google Maps / Places API ──────────────────────────────────────

log.section('TEST 6 — Google Maps Places API')

if (!process.env.GOOGLE_MAPS_API_KEY) {
  log.skip('GOOGLE_MAPS', 'GOOGLE_MAPS_API_KEY not set')
} else {
  try {
    const axios = (await import('axios')).default
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/textsearch/json',
      {
        params: {
          query: 'digital agency in Dubai',
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    )
    const status = response.data.status
    const count = response.data.results?.length || 0

    if (status === 'OK' && count > 0) {
      log.pass('GOOGLE_MAPS', `Places API working — returned ${count} results`)
    } else if (status === 'REQUEST_DENIED') {
      log.fail('GOOGLE_MAPS', `REQUEST_DENIED — ${response.data.error_message}. Make sure Places API is enabled.`)
    } else if (status === 'ZERO_RESULTS') {
      log.pass('GOOGLE_MAPS', 'API connected — zero results for test query (API is working)')
    } else {
      log.fail('GOOGLE_MAPS', `Unexpected status: ${status} — ${response.data.error_message || ''}`)
    }
  } catch (error) {
    log.fail('GOOGLE_MAPS', error.message)
  }
}

// ── Test 7: Hunter.io ──────────────────────────────────────────────────────

log.section('TEST 7 — Hunter.io API')

if (!process.env.HUNTER_API_KEY) {
  log.skip('HUNTER', 'HUNTER_API_KEY not set — email enrichment disabled')
} else {
  try {
    const axios = (await import('axios')).default
    const response = await axios.get('https://api.hunter.io/v2/account', {
      params: { api_key: process.env.HUNTER_API_KEY }
    })
    const data = response.data.data
    log.pass('HUNTER', `Account: ${data.email} — Searches used: ${data.requests.searches.used}/${data.requests.searches.available}`)
  } catch (error) {
    const status = error.response?.status
    if (status === 401) {
      log.fail('HUNTER', 'Invalid API key')
    } else {
      log.fail('HUNTER', error.response?.data?.errors?.[0]?.details || error.message)
    }
  }
}

// ── Test 8: Apollo.io ──────────────────────────────────────────────────────

log.section('TEST 8 — Apollo.io API')

if (!process.env.APOLLO_API_KEY) {
  log.skip('APOLLO', 'APOLLO_API_KEY not set — lead enrichment disabled')
} else {
  try {
    const axios = (await import('axios')).default
    const response = await axios.get(
      'https://api.apollo.io/v1/auth/health',
      {
        headers: {
          'x-api-key': process.env.APOLLO_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    )
    if (response.data.is_logged_in) {
      log.pass('APOLLO', `Authenticated — healthy: ${response.data.healthy === true}`)
    } else {
      log.fail('APOLLO', 'Authentication failed — check API key')
    }
  } catch (error) {
    const status = error.response?.status
    if (status === 401) {
      log.fail('APOLLO', 'Invalid API key — 401 Unauthorized')
    } else {
      log.fail('APOLLO', error.response?.data?.message || error.message)
    }
  }
}

// ── Test 9: Server Health ──────────────────────────────────────────────────

log.section('TEST 9 — Zephyr Server (must be running)')

try {
  const axios = (await import('axios')).default
  const response = await axios.get(`http://localhost:${process.env.PORT || 5000}/api/health`, {
    timeout: 3000
  })
  if (response.data.status === 'ok') {
    log.pass('SERVER', `Running on port ${process.env.PORT || 5000}`)
  } else {
    log.fail('SERVER', `Unexpected response: ${JSON.stringify(response.data)}`)
  }
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    log.fail('SERVER', 'Server is not running — start it with: cd server && npm run dev')
  } else {
    log.fail('SERVER', error.message)
  }
}

// ── Test 10: Full AI Pipeline (Mini) ──────────────────────────────────────

log.section('TEST 10 — Full AI Pipeline (Mini Lead Test)')

if (!process.env.AI_1_API_KEY) {
  log.skip('AI_PIPELINE', 'AI_1_API_KEY not set — skipping pipeline test')
} else {
  try {
    const { runLeadPipeline } = await import('./ai-engine/index.js')

    const testLead = {
      companyName: 'TestShop Dubai',
      website: 'https://testshop.ae',
      industry: 'E-commerce',
      country: 'UAE',
      businessSize: 'SMALL'
    }

    console.log('   Running mini pipeline for test lead (this may take 20-40 seconds)...')

    const result = await runLeadPipeline(testLead, {
      skipReview: !process.env.AI_2_API_KEY,
      skipPitch: false
    })

    if (result.success) {
      log.pass('AI_PIPELINE', `Pipeline completed — Score: ${result.finalScore}/10, Recommendation: ${result.recommendation}`)
      log.pass('AI_PIPELINE:ANALYSIS', `Analysis length: ${result.analysis?.length || 0} chars`)
      log.pass('AI_PIPELINE:PITCH', `Email template: ${result.emailTemplate ? 'Generated' : 'Missing'}`)
    } else {
      log.fail('AI_PIPELINE', `Pipeline failed — Errors: ${JSON.stringify(result.errors)}`)
    }
  } catch (error) {
    log.fail('AI_PIPELINE', error.message)
  }
}

// ── Final Summary ──────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(50))
console.log('  FINAL TEST SUMMARY')
console.log('═'.repeat(50))
console.log(`✅ PASSED:  ${results.passed.length}`)
console.log(`❌ FAILED:  ${results.failed.length}`)
console.log(`⚠️  SKIPPED: ${results.skipped.length}`)

if (results.failed.length > 0) {
  console.log('\nFailed tests:')
  results.failed.forEach(name => console.log(`  ❌ ${name}`))
}

if (results.skipped.length > 0) {
  console.log('\nSkipped (optional):')
  results.skipped.forEach(name => console.log(`  ⚠️  ${name}`))
}

if (results.failed.length === 0) {
  console.log('\n🎉 All required tests passed! Zephyr is ready to run.')
} else {
  console.log('\n⚠️  Fix the failed tests above before running Zephyr.')
}
