import { createClient } from '@supabase/supabase-js';
import { config } from './env';

export const supabase = createClient(config.supabaseUrl as string, config.supabaseServiceRoleKey as string, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export const supabaseAnon = createClient(config.supabaseUrl as string, config.supabaseAnonKey as string);
