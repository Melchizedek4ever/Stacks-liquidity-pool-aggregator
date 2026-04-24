"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTokens = fetchTokens;
exports.fetchTokenAliases = fetchTokenAliases;
const supabase_1 = require("./supabase");
async function fetchTokens() {
    const { data, error } = await supabase_1.supabase.from("tokens").select("id, symbol, name, decimals");
    if (error) {
        throw error;
    }
    return (data ?? []);
}
async function fetchTokenAliases() {
    const { data, error } = await supabase_1.supabase
        .from("token_aliases")
        .select("dex, alias, token_id");
    if (error) {
        throw error;
    }
    return (data ?? []);
}
