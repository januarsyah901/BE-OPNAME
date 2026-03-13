import { supabase } from './config/supabase';
import { config } from './config/env';

async function debug() {
    console.log('--- Supabase Debug ---');
    console.log('URL:', config.supabaseUrl);
    console.log('Key Length:', config.supabaseServiceRoleKey?.length || 0);
    
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
        console.error('Error listing buckets:', error);
    } else {
        console.log('Available Buckets:', buckets.map(b => b.name));
        const exists = buckets.find(b => b.name === 'wa-sessions');
        console.log('Does "wa-sessions" exist?', exists ? 'YES' : 'NO');
    }
}

debug();
