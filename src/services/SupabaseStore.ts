import { supabase } from '../config/supabase';
import fs from 'fs';
import path from 'path';

export class SupabaseStore {
    private bucket: string;

    constructor({ bucket = 'wa-session' } = {}) {
        this.bucket = bucket;
    }

    async sessionExists(options: { session: string }): Promise<boolean> {
        const sessionName = path.basename(options.session);
        const { data, error } = await supabase.storage.from(this.bucket).list('');
        if (error || !data) {
            console.error('[SupabaseStore] sessionExists error:', error);
            return false;
        }
        return data.some(file => file.name === `${sessionName}.zip`);
    }

    async save(options: { session: string }): Promise<void> {
        // options.session contains the full path in RemoteAuth, so we use basename.
        const sessionName = path.basename(options.session);
        const zipFile = `${options.session}.zip`;

        try {
            const fileBuffer = await fs.promises.readFile(zipFile);
            const { error } = await supabase.storage.from(this.bucket).upload(`${sessionName}.zip`, fileBuffer, {
                upsert: true,
                contentType: 'application/zip'
            });
            if (error) {
                console.error('[SupabaseStore] save upload error:', error);
            } else {
                console.log(`[SupabaseStore] ✅ Session ${sessionName} successfully synced to Supabase Storage.`);
            }
        } catch (err) {
            console.error('[SupabaseStore] Failed to read zip file for upload:', err);
        }
    }

    async extract(options: { session: string, path: string }): Promise<void> {
        const sessionName = path.basename(options.session);
        const dir = path.dirname(options.path);
        
        try {
            // Ensure the directory exists before writing to it
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const { data, error } = await supabase.storage.from(this.bucket).download(`${sessionName}.zip`);
            if (error || !data) {
                console.error('[SupabaseStore] extract download error:', error);
                return;
            }

            const buffer = Buffer.from(await data.arrayBuffer());
            await fs.promises.writeFile(options.path, buffer);
            console.log(`[SupabaseStore] 📥 Session ${sessionName} successfully extracted from Supabase Storage.`);
        } catch (err) {
            console.error('[SupabaseStore] Failed to write downloaded zip file:', err);
        }
    }

    async delete(options: { session: string }): Promise<void> {
        const sessionName = path.basename(options.session);
        try {
            const { error } = await supabase.storage.from(this.bucket).remove([`${sessionName}.zip`]);
            if (error) {
                console.error('[SupabaseStore] delete error:', error);
            } else {
                console.log(`[SupabaseStore] 🗑 Session ${sessionName} deleted from Supabase.`);
            }
        } catch (err) {
            console.error('[SupabaseStore] delete exception:', err);
        }
    }
}
