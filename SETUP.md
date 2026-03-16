# Setup & Deployment Guide

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

**Required variables:**
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase anon key
- `PORT`: API server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `UPDATE_INTERVAL`: Pool update frequency in ms (default: 60000)

### 3. Database Setup

Run the SQL migrations in your Supabase SQL editor in this order:

1. [001_create_tokens_table.sql](migrations/001_create_tokens_table.sql)
2. [002_create_token_aliases_table.sql](migrations/002_create_token_aliases_table.sql)
3. [003_create_pools_table.sql](migrations/003_create_pools_table.sql)

## Running the Application

### Development

```bash
npm run dev
```

Starts with hot reload via tsx watch.

### Production

```bash
npm run build
npm start
```

### Type Checking

```bash
npm run typecheck
```

## API Usage Examples

### Health Check

```bash
curl http://localhost:3000/health
```

### Get All Pools

```bash
curl http://localhost:3000/pools | jq
```

### Get Top Pools by APY

```bash
curl "http://localhost:3000/pools/top?limit=20" | jq
```

### Get Pools from Bitflow

```bash
curl http://localhost:3000/pools/bitflow | jq
```

### Get Token Pairs

```bash
curl "http://localhost:3000/pools/pair?tokenA=stx&tokenB=usda" | jq
```

### Get Available Tokens

```bash
curl http://localhost:3000/tokens | jq
```

## Architecture Overview

### Layered Design

```
API Layer (Fastify)
    ↓
Worker Layer (Scheduler)
    ↓
Service Layer (Aggregation, Token Registry)
    ↓
Adapter Layer (DEX Integration)
    ↓
Database Layer (Supabase/PostgreSQL)
```

### Key Components

1. **DEX Adapters** (`src/adapters/`): Fetch raw data from DEX APIs
   - BitflowAdapter
   - VelarAdapter
   - AlexAdapter

2. **Services** (`src/services/`):
   - `AggregationService`: Orchestrates data collection and scoring
   - `TokenRegistryService`: Normalizes token identifiers
   - `DatabaseService`: Handles database operations

3. **Workers** (`src/workers/`):
   - `IndexerWorker`: Runs scheduled pool updates

4. **API** (`src/api/`):
   - `routes.ts`: Fastify endpoint definitions

## Code Structure

### Adapters

Adapters are responsible for fetching and normalizing raw data from DEX APIs. They must:
- Implement the `DexAdapter` interface
- Only fetch data, no business logic
- Return normalized Pool objects
- Include retry logic for network failures

### Services

Services contain business logic and orchestration. They must:
- NOT make HTTP calls directly
- NOT handle HTTP responses
- Call adapters to get data
- Perform validation and transformation
- Interact with the database layer

### API Routes

API routes handle HTTP requests only:
- Parse query/path parameters
- Call services to get data
- Format responses
- Handle errors at the HTTP level

### Workers

Workers orchestrate periodic tasks:
- Schedule recurring jobs
- Call services to perform work
- Log results and errors
- Handle graceful shutdown

## Adding a New DEX

1. Create a new adapter class in `src/adapters/index.ts`:

```typescript
export class NewDexAdapter implements DexAdapter {
  name = 'newdex';
  private baseUrl = 'https://api.newdex.com';

  async fetchPools(): Promise<Pool[]> {
    return withRetry(async () => {
      const response = await axios.get(`${this.baseUrl}/pools`);
      return this.normalizePools(response.data);
    });
  }

  private normalizePools(data: unknown): Pool[] {
    // Normalize API response to Pool format
    if (!Array.isArray(data)) {
      console.warn('NewDex API returned non-array data');
      return [];
    }

    return data.map((pool) => ({
      dex: 'newdex',
      tokenA: String(pool.token_a).toLowerCase(),
      tokenB: String(pool.token_b).toLowerCase(),
      liquidity_usd: Number(pool.liquidity),
      apy: Number(pool.apy),
      volume_24h: Number(pool.volume),
      last_updated: Date.now(),
    })).filter(p => validatePool(p));
  }
}
```

2. Add the adapter to the server initialization in `src/server.ts`:

```typescript
const adapters = [
  new BitflowAdapter(),
  new VelarAdapter(),
  new AlexAdapter(),
  new NewDexAdapter(),  // Add here
];
```

3. Add token aliases in your Supabase dashboard or update migration:

```sql
INSERT INTO token_aliases (dex, alias, token_id) VALUES
  ('newdex', 'USDA', 'usda'),
  ('newdex', 'sBTC', 'sbtc')
ON CONFLICT DO NOTHING;
```

## Error Handling Strategy

### Network Errors

All adapter calls implement exponential backoff retry:

```typescript
withRetry(
  async () => fetchFromAPI(),
  {
    maxRetries: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
  }
);
```

### Validation Errors

Pools that fail validation are:
- Filtered out before storage
- Logged with specific error reason
- Never stored or returned to API clients

### Adapter Failures

If an adapter fails:
- Error is caught and logged
- Other adapters continue executing
- Failure info is included in aggregation result
- System remains operational with partial data

### Database Errors

Database operations include error handling:
- Errors are caught and logged
- Caller is informed of failure
- Transaction-like behavior for data consistency

## Monitoring & Logging

The system logs important events:

```
Starting pool aggregation...
✓ bitflow: 12 pools
✓ velar: 8 pools
✓ alex: 15 pools
Aggregated 35 pools
Saved 35 pools to database
Pool update completed in 1243ms
```

Monitor these logs for:
- Adapter success/failure
- Pool counts
- Validation errors
- Database issues

## Performance Optimization

### Database Indexes

The database includes indexes on:
- `dex` column (for filtering by DEX)
- `token_a, token_b` columns (for pair lookups)
- `apy` column (for sorting by APY)
- `liquidity_usd` column (for sorting by TVL)
- `last_updated` column (for time-based queries)

### API Response Times

- All responses are JSON
- Use pagination with limit parameter (max 100)
- API queries should return in < 300ms

### Caching Strategy (Future)

For production deployments, consider:
- Redis caching of pool data
- Cache invalidation on updates
- ETags for conditional requests

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Dependencies installed (`npm install`)
- [ ] TypeScript builds without errors (`npm run typecheck`)
- [ ] Code built successfully (`npm run build`)
- [ ] Tested locally (`npm run dev`)
- [ ] Health check endpoint working (`/health`)
- [ ] Database connection verified
- [ ] Adapter endpoints accessible
- [ ] Monitoring/logging setup

## Production Considerations

1. **Environment Variables**: Use secure vault, never commit `.env`
2. **Database**: Use Supabase production tier with backups
3. **Monitoring**: Set up logs aggregation and alerting
4. **Error Tracking**: Integrate Sentry or similar
5. **Rate Limiting**: Consider adding rate limits to API
6. **CORS**: Configure appropriately for frontend clients
7. **Auto-Restart**: Use PM2 or Docker for process management
8. **Health Checks**: Monitor `/health` endpoint regularly

## Troubleshooting

### Module Not Found Errors

Run `npm install` to install dependencies.

### Database Connection Failed

- Verify `SUPABASE_URL` and `SUPABASE_KEY` in `.env`
- Check network connectivity to Supabase
- Verify API key has proper permissions

### No Pools Being Fetched

- Check adapter error logs
- Verify DEX API endpoints are accessible
- Check if adapter response format has changed

### Type Errors After Build

Run `npm run typecheck` and fix reported issues.

### Port Already in Use

Change `PORT` in `.env` or kill the process using the port.

## Useful Commands

```bash
# Type checking
npm run typecheck

# Build
npm run build

# Development with hot reload
npm run dev

# Production
npm start

# View available npm scripts
npm run
```

## Performance Metrics

Expected performance characteristics:

- Pool aggregation: 1-2 seconds (network dependent)
- API response: 50-100ms (typical, < 300ms max)
- Memory usage: 50-100MB (typical)
- Database latency: < 50ms (indexed queries)
- Update cycle: 60 seconds (configurable)

## Support & Debugging

For issues:

1. Check logs for error messages
2. Verify environment configuration
3. Test DEX API endpoints manually
4. Check database connectivity
5. Verify TypeScript compilation
