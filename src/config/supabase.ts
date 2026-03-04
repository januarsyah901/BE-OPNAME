import { createClient } from '@supabase/supabase-js';
import { config } from './env';

// This uses the service role key to bypass RLS in the backend.
// In a typical backend with Supabase, the backend handles authorization logic.
export const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// A secondary client using ANON key if needed for client-side mimicking
export const supabaseAnon = createClient(config.supabaseUrl, config.supabaseAnonKey);
