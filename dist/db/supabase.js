"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and SUPABASE_KEY must be configured");
}
function tryGetSupabaseRoleFromJwt(jwt) {
    const parts = jwt.split(".");
    if (parts.length < 2)
        return null;
    try {
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
        return typeof payload?.role === "string" ? payload.role : null;
    }
    catch {
        return null;
    }
}
const keyRole = tryGetSupabaseRoleFromJwt(supabaseKey);
if (keyRole === "anon") {
    console.warn("[db] SUPABASE_KEY has role=anon. Server-side upserts may fail under RLS. Use the service_role key or add explicit INSERT/UPDATE policies for role anon.");
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});
