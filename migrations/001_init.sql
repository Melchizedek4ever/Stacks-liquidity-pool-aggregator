create extension if not exists "pgcrypto";

create table if not exists tokens (
  id text primary key,
  symbol text not null,
  name text not null,
  decimals integer not null
);

create table if not exists token_aliases (
  dex text not null,
  alias text not null,
  token_id text not null references tokens(id)
);

create unique index if not exists token_aliases_unique
  on token_aliases (dex, alias);

create table if not exists pools (
  id uuid primary key default gen_random_uuid(),
  dex text not null,
  token_a text not null,
  token_b text not null,
  liquidity_usd numeric not null,
  apy numeric not null,
  volume_24h numeric not null,
  last_updated timestamp not null
);

create unique index if not exists pools_unique
  on pools (dex, token_a, token_b);

create index if not exists pools_dex_idx
  on pools (dex);
