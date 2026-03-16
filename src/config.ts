import dotenv from 'dotenv';
import { Config } from '../types/pool.js';

// Load environment variables
dotenv.config();

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): Config {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const port = Number(process.env.PORT) || 3000;
  const nodeEnv = process.env.NODE_ENV || 'development';
  const updateInterval = Number(process.env.UPDATE_INTERVAL) || 60000;

  // Validate required environment variables
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!supabaseKey) {
    throw new Error('SUPABASE_KEY environment variable is required');
  }

  return {
    supabaseUrl,
    supabaseKey,
    port,
    nodeEnv,
    updateInterval,
  };
}

/**
 * Log configuration (without sensitive data)
 */
export function logConfig(config: Config): void {
  console.log('Configuration loaded:');
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  Update Interval: ${config.updateInterval}ms`);
  console.log(`  Supabase URL: ${config.supabaseUrl}`);
}
