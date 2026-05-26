-- Migration: 005_add_ranking_fields_to_pools
-- Adds token metadata, ranking scores, and display flag so the indexer can
-- persist its full computed state and the API can serve pre-ranked results
-- without re-running the ranking algorithm on every request.

ALTER TABLE pools
  ADD COLUMN IF NOT EXISTS token_a_symbol   TEXT,
  ADD COLUMN IF NOT EXISTS token_b_symbol   TEXT,
  ADD COLUMN IF NOT EXISTS token_a_verified BOOLEAN,
  ADD COLUMN IF NOT EXISTS token_b_verified BOOLEAN,
  ADD COLUMN IF NOT EXISTS fee_bps          NUMERIC,
  ADD COLUMN IF NOT EXISTS last_trade_time  TIMESTAMP,
  ADD COLUMN IF NOT EXISTS validation_score NUMERIC,
  ADD COLUMN IF NOT EXISTS validation_flags TEXT[],
  ADD COLUMN IF NOT EXISTS quality_tier     TEXT,
  ADD COLUMN IF NOT EXISTS score            NUMERIC,
  ADD COLUMN IF NOT EXISTS is_displayed     BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS pools_is_displayed_idx ON pools (is_displayed)
  WHERE is_displayed = TRUE;

CREATE INDEX IF NOT EXISTS pools_score_idx ON pools (score DESC NULLS LAST);
