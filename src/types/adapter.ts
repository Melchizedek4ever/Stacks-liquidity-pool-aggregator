/**
 * DEX Adapter Interface
 * All DEX adapters must implement this interface
 */
export interface DexAdapter {
  name: string;
  fetchPools(): Promise<unknown[]>;
}

/**
 * Retry options
 */
export interface RetryOptions {
  maxRetries: number;
  delayMs: number;
  backoffMultiplier: number;
}
