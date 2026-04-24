"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.logConfig = logConfig;
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
/**
 * Load and validate configuration from environment variables
 */
function loadConfig() {
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
function logConfig(config) {
    console.log('Configuration loaded:');
    console.log(`  Environment: ${config.nodeEnv}`);
    console.log(`  Port: ${config.port}`);
    console.log(`  Update Interval: ${config.updateInterval}ms`);
    console.log(`  Supabase URL: ${config.supabaseUrl}`);
}
