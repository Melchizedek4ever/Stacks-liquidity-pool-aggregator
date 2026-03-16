-- Migration: 002_create_token_aliases_table
-- Description: Creates the token_aliases table for DEX-specific token mappings

CREATE TABLE IF NOT EXISTS token_aliases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dex TEXT NOT NULL,
  alias TEXT NOT NULL,
  token_id TEXT NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(dex, alias)
);

CREATE INDEX IF NOT EXISTS token_aliases_dex_idx ON token_aliases(dex);
CREATE INDEX IF NOT EXISTS token_aliases_token_id_idx ON token_aliases(token_id);

-- Insert example aliases for Bitflow
INSERT INTO token_aliases (dex, alias, token_id) VALUES
  ('bitflow', 'SP3Y5PRK69D34VYK3FNGZPZ69CJZS73R4D0N8X5AY.usda-token', 'usda'),
  ('bitflow', 'SP1Y5PRK69D34VYK3FNGZPZ69CJZS73R4FZQD3HY.sbtc-token', 'sbtc')
ON CONFLICT DO NOTHING;

-- Insert example aliases for Velar
INSERT INTO token_aliases (dex, alias, token_id) VALUES
  ('velar', 'USDA', 'usda'),
  ('velar', 'sBTC', 'sbtc')
ON CONFLICT DO NOTHING;

-- Insert example aliases for Alex
INSERT INTO token_aliases (dex, alias, token_id) VALUES
  ('alex', 'Wrapped-USDA', 'usda'),
  ('alex', 'Wrapped-sBTC', 'sbtc')
ON CONFLICT DO NOTHING;
