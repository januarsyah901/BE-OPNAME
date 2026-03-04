"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAnon = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("./env");
// This uses the service role key to bypass RLS in the backend.
// In a typical backend with Supabase, the backend handles authorization logic.
exports.supabase = (0, supabase_js_1.createClient)(env_1.config.supabaseUrl, env_1.config.supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
// A secondary client using ANON key if needed for client-side mimicking
exports.supabaseAnon = (0, supabase_js_1.createClient)(env_1.config.supabaseUrl, env_1.config.supabaseAnonKey);
