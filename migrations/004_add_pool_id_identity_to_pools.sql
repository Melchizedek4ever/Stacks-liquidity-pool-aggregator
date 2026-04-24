-- Migration: 004_add_pool_id_identity_to_pools
-- Description: Make pool_id the storage identity so multiple pools per token pair can coexist.

ALTER TABLE pools
ADD COLUMN IF NOT EXISTS pool_id TEXT;

-- Backfill existing rows with deterministic ids where pool_id is missing.
UPDATE pools
SET pool_id = CONCAT('legacy:', dex, ':', token_a, ':', token_b)
WHERE pool_id IS NULL;

-- Remove old uniqueness that forced one row per (dex, token_a, token_b).
ALTER TABLE pools
DROP CONSTRAINT IF EXISTS pools_dex_token_a_token_b_key;

-- Older schema used a unique index (not a table constraint) with this name.
DROP INDEX IF EXISTS pools_unique;

-- Enforce uniqueness per DEX pool identity.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pools_dex_pool_id_key'
      AND conrelid = 'pools'::regclass
  ) THEN
    ALTER TABLE pools
    ADD CONSTRAINT pools_dex_pool_id_key UNIQUE (dex, pool_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS pools_pool_id_idx ON pools(pool_id);
