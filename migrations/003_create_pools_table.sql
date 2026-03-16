-- Migration: 003_create_pools_table
-- Description: Creates the pools table for storing liquidity pool data

CREATE TABLE IF NOT EXISTS pools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dex TEXT NOT NULL,
  token_a TEXT NOT NULL,
  token_b TEXT NOT NULL,
  liquidity_usd NUMERIC NOT NULL,
  apy NUMERIC NOT NULL,
  volume_24h NUMERIC NOT NULL,
  last_updated TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(dex, token_a, token_b)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS pools_dex_idx ON pools(dex);
CREATE INDEX IF NOT EXISTS pools_tokens_idx ON pools(token_a, token_b);
CREATE INDEX IF NOT EXISTS pools_apy_idx ON pools(apy DESC);
CREATE INDEX IF NOT EXISTS pools_liquidity_idx ON pools(liquidity_usd DESC);
CREATE INDEX IF NOT EXISTS pools_last_updated_idx ON pools(last_updated DESC);

-- Create a view for ranked pools (by APY for now)
CREATE OR REPLACE VIEW ranked_pools AS
SELECT 
  *,
  ROW_NUMBER() OVER (ORDER BY apy DESC) as rank
FROM pools
WHERE last_updated > NOW() - INTERVAL '24 hours';
