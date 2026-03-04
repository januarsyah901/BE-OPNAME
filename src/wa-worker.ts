/**
 * WA Worker — Berjalan di lokal, TERPISAH dari REST API (Vercel).
 *
 * Cara kerja:
 *   1. Inisialisasi WA Web.js client (QR scan sekali saja, session tersimpan)
 *   2. Setiap POLL_INTERVAL_MS, ambil semua wa_notifications dengan status 'pending'
 *   3. Kirim satu per satu via WA Web.js
 *   4. Update status ke 'sent' atau 'failed'
 *
 * Jalankan dengan:
 *   npm run wa:worker
 *
 * Arsitektur hybrid:
 *   Vercel (REST API) → insert 'pending' ke DB
 *   WA Worker (local) → polling DB → kirim WA
 */

import prisma from './config/prisma';
import {
    initWaClient,
    getWaStatus,
    sendWaMessage
} from './services/waClientService';

const POLL_INTERVAL_MS = 15_000; // polling setiap 15 detik
const READY_CHECK_INTERVAL_MS = 3_000; // cek status "ready" setiap 3 detik

// ============================================================
// Tunggu sampai WA client berstatus 'ready'
// ============================================================
async function waitUntilReady(timeoutMs = 5 * 60 * 1000): Promise<boolean> {
    const start = Date.now();
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            const { status } = getWaStatus();
            if (status === 'ready') {
                clearInterval(interval);
                resolve(true);
            }
            if (Date.now() - start > timeoutMs) {
                clearInterval(interval);
                console.error('[WA Worker] Timeout menunggu WA client ready.');
                resolve(false);
            }
        }, READY_CHECK_INTERVAL_MS);
    });
}

// ============================================================
// Kirim semua notifikasi pending dari DB
// ============================================================
async function processPendingNotifications(): Promise<void> {
    const { status } = getWaStatus();
    if (status !== 'ready') {
        console.log(`[WA Worker] Skip polling — client status: ${status}`);
        return;
    }

    let pending: any[];
    try {
        pending = await prisma.wa_notifications.findMany({
            where: { status: 'pending' },
            orderBy: { created_at: 'asc' },
            take: 20 // proses max 20 per batch
        });
    } catch (err) {
        console.error('[WA Worker] Gagal fetch pending dari DB:', err);
        return;
    }

    if (pending.length === 0) return;

    console.log(`[WA Worker] Memproses ${pending.length} notifikasi pending...`);

    for (const notif of pending) {
        try {
            const result = await sendWaMessage(notif.wa_number, notif.message_body);
            await prisma.wa_notifications.update({
                where: { id: notif.id },
                data: {
                    status: result.success ? 'sent' : 'failed',
                    sent_at: result.success ? new Date() : null
                }
            });

            if (result.success) {
                console.log(`[WA Worker] ✅ Sent notif #${notif.id} → ${notif.wa_number}`);
            } else {
                console.warn(`[WA Worker] ❌ Failed notif #${notif.id}: ${result.error}`);
            }
        } catch (err) {
            console.error(`[WA Worker] Error saat proses notif #${notif.id}:`, err);
            // Tandai sebagai failed agar tidak diproses terus
            await prisma.wa_notifications.update({
                where: { id: notif.id },
                data: { status: 'failed' }
            }).catch(() => { });
        }

        // Jeda kecil antar pesan agar tidak dianggap spam oleh WA
        await delay(1500);
    }
}

// ============================================================
// Proses retry untuk notifikasi 'failed' yang sudah lama
// (opsional: diaktifkan secara terpisah via flag/schedule)
// ============================================================
async function processFailedRetry(): Promise<void> {
    const { status } = getWaStatus();
    if (status !== 'ready') return;

    // Ambil notifikasi failed yang dibuat > 5 menit lalu (belum pernah retry baru)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    let failed: any[];
    try {
        failed = await prisma.wa_notifications.findMany({
            where: {
                status: 'failed',
                created_at: { lt: fiveMinutesAgo },
                sent_at: null // belum pernah terkirim sama sekali
            },
            take: 5
        });
    } catch {
        return;
    }

    if (failed.length === 0) return;

    console.log(`[WA Worker] Retry ${failed.length} notifikasi failed...`);

    for (const notif of failed) {
        // Set ke pending dulu agar dipick up di siklus polling berikutnya
        await prisma.wa_notifications.update({
            where: { id: notif.id },
            data: { status: 'pending' }
        }).catch(() => { });
        await delay(500);
    }
}

// ============================================================
// Utility
// ============================================================
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// Main
// ============================================================
async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log('║   AutoService — WA Notification Worker  ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('');
    console.log('[WA Worker] Menginisialisasi WhatsApp Web.js...');
    console.log('[WA Worker] Jika diminta, scan QR yang muncul di terminal.');
    console.log('');

    initWaClient();

    // Tunggu ready (max 5 menit — cukup waktu untuk scan QR)
    const ready = await waitUntilReady();
    if (!ready) {
        console.error('[WA Worker] Gagal connect. Coba jalankan ulang.');
        process.exit(1);
    }

    console.log('[WA Worker] ✅ WhatsApp terhubung! Mulai polling...');
    console.log(`[WA Worker] Interval polling: ${POLL_INTERVAL_MS / 1000}s`);
    console.log('');

    // Jalankan segera saat pertama kali
    await processPendingNotifications();

    // Polling loop
    setInterval(async () => {
        await processPendingNotifications();
    }, POLL_INTERVAL_MS);

    // Retry failed setiap 10 menit
    setInterval(async () => {
        await processFailedRetry();
    }, 10 * 60 * 1000);

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
        console.log(`\n[WA Worker] Menerima ${signal}, shutting down...`);
        await prisma.$disconnect();
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
    console.error('[WA Worker] Fatal error:', err);
    process.exit(1);
});
