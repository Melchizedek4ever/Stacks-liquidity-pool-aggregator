import cron from "node-cron"
import { aggregatePools } from "../services/aggregator"
import { rankPools } from "../services/ranking"
import { savePools } from "../services/savePools"
import { MIN_VALIDATION_SCORE } from "../utils/validatePool"

const DEFAULT_CRON = "*/1 * * * *"
const RANKING_MIN_SCORE = Number(process.env.RANKING_MIN_VALIDATION_SCORE ?? MIN_VALIDATION_SCORE)

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
      const aggregation = await aggregatePools()
      const ranked = rankPools(aggregation.pools)
      const eligibleForPersistence = ranked.filter(
        (pool) => (pool.validation_score ?? 0) >= RANKING_MIN_SCORE
      )
      const persisted = await savePools(eligibleForPersistence)
      console.info(
        JSON.stringify({
          event: "indexer_run_complete",
          fetched: aggregation.fetched,
          scored: aggregation.scored,
          retained: aggregation.retained,
          rejected: aggregation.rejected,
          threshold_score: RANKING_MIN_SCORE,
          ranked: ranked.length,
          eligible: eligibleForPersistence.length,
          persisted,
          rejection_rate:
            aggregation.fetched > 0
              ? Number((aggregation.rejected / aggregation.fetched).toFixed(4))
              : 0
        })
      )
    } catch (error) {
      console.error("Indexer run failed", error)
    } finally {
      running = false
    }
  })
}
