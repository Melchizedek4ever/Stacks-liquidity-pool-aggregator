# Stacks Liquidity Pool Aggregator
An aggregator that monitors and analyzes LPs in the Stacks ecosystem for business intelligence.

## Setup
1. Copy `.env.example` to `.env` and fill in the required values.
2. Apply the SQL in `migrations/001_init.sql` to your Supabase Postgres instance.

## Scripts
- `npm run dev` starts the API and indexer with tsx.
- `npm run build` compiles to `dist/`.
- `npm start` runs the compiled server.
