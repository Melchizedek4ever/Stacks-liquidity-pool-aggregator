"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
/**
 * Database Service
 * Handles all database operations for pool storage and retrieval
 */
class DatabaseService {
    supabase;
    constructor(supabase) {
        this.supabase = supabase;
    }
    /**
     * Save pools to the database
     * Uses upsert to handle duplicate entries
     */
    async savePools(pools) {
        if (pools.length === 0) {
            return;
        }
        try {
            // Prepare pools for insertion (remove score field, use last_updated as timestamp)
            const poolsToSave = pools.map((pool) => ({
                dex: pool.dex,
                pool_id: pool.pool_id ?? null,
                token_a: pool.tokenA,
                token_b: pool.tokenB,
                liquidity_usd: pool.liquidity_usd,
                apy: pool.apy,
                volume_24h: pool.volume_24h,
                last_updated: new Date(pool.last_updated).toISOString(),
            }));
            const { error: modernError } = await this.supabase
                .from('pools')
                .upsert(poolsToSave, {
                onConflict: 'dex,pool_id',
            });
            if (modernError) {
                console.warn(`[db] modern pool upsert failed; falling back to legacy key. reason=${modernError.message}`);
                for (const row of poolsToSave) {
                    const { error: legacyError } = await this.supabase
                        .from('pools')
                        .upsert(row, {
                        onConflict: 'dex, token_a, token_b',
                    });
                    if (legacyError) {
                        throw legacyError;
                    }
                }
            }
            console.log(`Saved ${pools.length} pools to database`);
        }
        catch (error) {
            console.error('Failed to save pools:', error);
            throw error;
        }
    }
    /**
     * Get all pools from the database
     */
    async getAllPools() {
        try {
            const { data, error } = await this.supabase
                .from('pools')
                .select('*')
                .order('apy', { ascending: false });
            if (error) {
                throw error;
            }
            if (!data) {
                return [];
            }
            return data.map((row) => ({
                dex: row.dex,
                pool_id: row.pool_id ?? undefined,
                tokenA: row.token_a,
                tokenB: row.token_b,
                liquidity_usd: row.liquidity_usd,
                apy: row.apy,
                volume_24h: row.volume_24h,
                last_updated: new Date(row.last_updated).getTime(),
            }));
        }
        catch (error) {
            console.error('Failed to get pools:', error);
            throw error;
        }
    }
    /**
     * Get top N pools by APY
     */
    async getTopPools(limit = 10) {
        try {
            const { data, error } = await this.supabase
                .from('pools')
                .select('*')
                .order('apy', { ascending: false })
                .limit(limit);
            if (error) {
                throw error;
            }
            if (!data) {
                return [];
            }
            return data.map((row) => ({
                dex: row.dex,
                pool_id: row.pool_id ?? undefined,
                tokenA: row.token_a,
                tokenB: row.token_b,
                liquidity_usd: row.liquidity_usd,
                apy: row.apy,
                volume_24h: row.volume_24h,
                last_updated: new Date(row.last_updated).getTime(),
            }));
        }
        catch (error) {
            console.error('Failed to get top pools:', error);
            throw error;
        }
    }
    /**
     * Get pools by DEX
     */
    async getPoolsByDex(dex) {
        try {
            const { data, error } = await this.supabase
                .from('pools')
                .select('*')
                .eq('dex', dex)
                .order('apy', { ascending: false });
            if (error) {
                throw error;
            }
            if (!data) {
                return [];
            }
            return data.map((row) => ({
                dex: row.dex,
                pool_id: row.pool_id ?? undefined,
                tokenA: row.token_a,
                tokenB: row.token_b,
                liquidity_usd: row.liquidity_usd,
                apy: row.apy,
                volume_24h: row.volume_24h,
                last_updated: new Date(row.last_updated).getTime(),
            }));
        }
        catch (error) {
            console.error(`Failed to get pools for DEX ${dex}:`, error);
            throw error;
        }
    }
    /**
     * Get pools by token pair
     */
    async getPoolsByTokenPair(tokenA, tokenB) {
        try {
            const { data, error } = await this.supabase
                .from('pools')
                .select('*')
                .or(`and(token_a.eq.${tokenA},token_b.eq.${tokenB}),and(token_a.eq.${tokenB},token_b.eq.${tokenA})`)
                .order('apy', { ascending: false });
            if (error) {
                throw error;
            }
            if (!data) {
                return [];
            }
            return data.map((row) => ({
                dex: row.dex,
                pool_id: row.pool_id ?? undefined,
                tokenA: row.token_a,
                tokenB: row.token_b,
                liquidity_usd: row.liquidity_usd,
                apy: row.apy,
                volume_24h: row.volume_24h,
                last_updated: new Date(row.last_updated).getTime(),
            }));
        }
        catch (error) {
            console.error('Failed to get pools by token pair:', error);
            throw error;
        }
    }
    /**
     * Delete old pools (older than specified time)
     */
    async deleteOldPools(beforeTimestamp) {
        try {
            const { error } = await this.supabase
                .from('pools')
                .delete()
                .lt('last_updated', beforeTimestamp);
            if (error) {
                throw error;
            }
            console.log('Deleted old pools from database');
        }
        catch (error) {
            console.error('Failed to delete old pools:', error);
            throw error;
        }
    }
}
exports.DatabaseService = DatabaseService;
