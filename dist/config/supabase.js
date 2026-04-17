"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAnon = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("./env");
exports.supabase = (0, supabase_js_1.createClient)(env_1.config.supabaseUrl, env_1.config.supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
exports.supabaseAnon = (0, supabase_js_1.createClient)(env_1.config.supabaseUrl, env_1.config.supabaseAnonKey);
