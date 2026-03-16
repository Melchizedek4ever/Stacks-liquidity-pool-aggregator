import cron from "node-cron"
import { aggregatePools } from "../services/aggregator"
import { rankPools } from "../services/ranking"
import { savePools } from "../services/savePools"

const DEFAULT_CRON = "*/1 * * * *"

export function startIndexer(): void {
  if (process.env.DISABLE_INDEXER === "true") {
    console.info("Indexer disabled")
    return
  }

  const schedule = process.env.INDEXER_CRON || DEFAULT_CRON
  let running = false

  cron.schedule(schedule, async () => {
    if (running) {
      console.warn("Indexer is already running, skipping this tick")
      return
    }

    running = true
    try {
      const pools = await aggregatePools()
      const ranked = rankPools(pools)
      await savePools(pools)
      console.info(`Indexed ${pools.length} pools, ranked ${ranked.length}`)
    } catch (error) {
      console.error("Indexer run failed", error)
    } finally {
      running = false
    }
  })
}
