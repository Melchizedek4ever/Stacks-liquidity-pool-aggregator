-- Migration: 001_create_tokens_table
-- Description: Creates the tokens table for canonical token storage

CREATE TABLE IF NOT EXISTS tokens (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  decimals INTEGER NOT NULL DEFAULT 18,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tokens_symbol_idx ON tokens(symbol);

-- Insert default tokens
INSERT INTO tokens (id, symbol, name, decimals) VALUES
  ('stx', 'STX', 'Stacks', 6),
  ('usda', 'USDA', 'USDA Stablecoin', 6),
  ('sbtc', 'sBTC', 'Synthetic Bitcoin', 8)
ON CONFLICT (id) DO NOTHING;
