import cron from 'node-cron'
import { runDiscoveryPipeline } from './pipeline.js'
import dotenv from 'dotenv'
dotenv.config()

let isRunning = false

const runPipelineJob = async (label) => {
  if (isRunning) {
    console.log(`[Scheduler] Skipping ${label} — pipeline already running`)
    return
  }
  isRunning = true
  console.log(`[Scheduler] Starting: ${label} at ${new Date().toISOString()}`)

  try {
    const result = await runDiscoveryPipeline({
      sources: ['google', 'maps', 'producthunt'],
      enrichPublic: true,
      enrichPaidApis: false,
      saveToServer: false,
      maxLeads: 50
    })
    console.log(`[Scheduler] ${label} complete — ${result.summary.leadsDiscovered} leads`)
  } catch (error) {
    console.error(`[Scheduler] ${label} failed:`, error.message)
  } finally {
    isRunning = false
  }
}

export const startScheduler = () => {
  cron.schedule('0 8 * * *', () => runPipelineJob('Morning (8:00 AM)'), { timezone: 'Asia/Kolkata' })
  cron.schedule('0 12 * * *', () => runPipelineJob('Midday (12:00 PM)'), { timezone: 'Asia/Kolkata' })
  cron.schedule('0 17 * * *', () => runPipelineJob('Evening (5:00 PM)'), { timezone: 'Asia/Kolkata' })
  console.log('[Scheduler] Active — runs at 8AM, 12PM, 5PM IST daily')
}

export const stopScheduler = () => {
  cron.getTasks().forEach(task => task.stop())
  console.log('[Scheduler] Stopped')
}

export const isSchedulerRunning = () => isRunning

// Allow manual trigger: node scraper/scheduler.js --run-now
if (process.argv.includes('--run-now')) {
  runPipelineJob('Manual Run').then(() => process.exit(0))
}
