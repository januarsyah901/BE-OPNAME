wimport { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import prisma from '../config/prisma';

/**
 * WA Web.js Client Service
 *
 * Mengelola satu instance WhatsApp Web client (singleton).
 * - QR digenerate saat pertama kali inisialisasi
 * - Session disimpan ke disk via LocalAuth agar tidak perlu scan ulang
 * - Menyediakan fungsi sendMessage() untuk kirim pesan WA
 */

type ClientStatus = 'initializing' | 'qr_ready' | 'authenticated' | 'ready' | 'disconnected';

let waClient: Client | null = null;
let clientStatus: ClientStatus = 'initializing';
let lastQrBase64: string | null = null;
let lastQrExpiresAt: Date | null = null;

const QR_TIMEOUT_MS = 2 * 60 * 1000; // QR valid 2 menit

/**
 * Inisialisasi WA client (dipanggil saat server startup).
 * Idempotent — jika sudah di-init, langsung return.
 */
export const initWaClient = (): void => {
    if (waClient) return;

    console.log('[WA] Initializing WhatsApp Web client...');

    waClient = new Client({
        authStrategy: new LocalAuth({
            dataPath: '.wwebjs_auth'
        }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
        }
    });

    waClient.on('qr', async (qr) => {
        console.log('[WA] QR received, expires in 2 minutes.');
        clientStatus = 'qr_ready';
        lastQrExpiresAt = new Date(Date.now() + QR_TIMEOUT_MS);
        try {
            lastQrBase64 = await qrcode.toDataURL(qr);
        } catch (err) {
            console.error('[WA] Failed to convert QR to base64:', err);
        }
    });

    waClient.on('authenticated', () => {
        console.log('[WA] Authenticated!');
        clientStatus = 'authenticated';
        lastQrBase64 = null;
        lastQrExpiresAt = null;
    });

    waClient.on('ready', () => {
        console.log('[WA] Client is ready!');
        clientStatus = 'ready';
    });

    waClient.on('disconnected', (reason) => {
        console.warn('[WA] Client disconnected:', reason);
        clientStatus = 'disconnected';
        waClient = null;
        lastQrBase64 = null;
    });

    waClient.on('auth_failure', (msg) => {
        console.error('[WA] Auth failure:', msg);
        clientStatus = 'disconnected';
        waClient = null;
    });

    clientStatus = 'initializing';
    waClient.initialize().catch((err) => {
        console.error('[WA] Initialize error:', err);
        clientStatus = 'disconnected';
    });
};

/**
 * Re-inisialisasi client (untuk keperluan restart / logout).
 */
export const restartWaClient = (): void => {
    if (waClient) {
        waClient.destroy().catch(() => { });
        waClient = null;
    }
    clientStatus = 'initializing';
    lastQrBase64 = null;
    lastQrExpiresAt = null;
    initWaClient();
};

/**
 * Ambil status koneksi WA client saat ini.
 */
export const getWaStatus = (): { status: ClientStatus; qr_expires_at: Date | null } => {
    return {
        status: clientStatus,
        qr_expires_at: lastQrExpiresAt
    };
};

/**
 * Ambil QR base64 (data URL) untuk ditampilkan di frontend.
 * Returns null jika belum ada QR atau sudah expired/authenticated.
 */
export const getWaQr = (): string | null => {
    if (clientStatus === 'ready' || clientStatus === 'authenticated') return null;
    if (!lastQrBase64) return null;
    if (lastQrExpiresAt && new Date() > lastQrExpiresAt) return null;
    return lastQrBase64;
};

/**
 * Kirim pesan WhatsApp ke nomor tujuan.
 * Format nomor: dimulai dengan kode negara tanpa '+' (misal: 628123456789)
 *
 * @returns { success: boolean, error?: string }
 */
export const sendWaMessage = async (
    phone: string,
    message: string
): Promise<{ success: boolean; error?: string }> => {
    if (!waClient || clientStatus !== 'ready') {
        return { success: false, error: 'WA client belum siap. Pastikan sudah scan QR.' };
    }

    try {
        // Format nomor ke format WA: [phone]@c.us
        const normalizedPhone = phone.replace(/\D/g, '');
        const chatId = `${normalizedPhone}@c.us`;

        await waClient.sendMessage(chatId, message);
        return { success: true };
    } catch (err: any) {
        console.error('[WA] Send message error:', err);
        return { success: false, error: err.message || 'Gagal mengirim pesan' };
    }
};

/**
 * Kirim notifikasi stok menipis ke nomor owner/admin (dari settings).
 * Menyimpan log ke tabel wa_notifications.
 */
export const triggerWaNotificationIfNeeded = async (
    sparePartId: number,
    currentStock: number
): Promise<void> => {
    try {
        const part = await prisma.spare_parts.findUnique({
            where: { id: sparePartId },
            select: { name: true, sku: true, minimum_stock: true, unit: true }
        });

        if (!part || currentStock > part.minimum_stock) return;

        const settings = await prisma.bengkel_profile.findFirst({
            select: { wa_target_number: true }
        });

        if (!settings?.wa_target_number) return;

        const message =
            `⚠️ *Stok Menipis!*\n\n` +
            `Item: *${part.name}*\n` +
            `SKU: ${part.sku}\n` +
            `Stok Saat Ini: *${currentStock} ${part.unit ?? 'pcs'}*\n` +
            `Minimum Stok: ${part.minimum_stock} ${part.unit ?? 'pcs'}\n\n` +
            `Segera lakukan restock!`;

        // Simpan log notifikasi (default pending)
        const notif = await prisma.wa_notifications.create({
            data: {
                spare_part_id: sparePartId,
                wa_number: settings.wa_target_number,
                message_body: message,
                status: 'pending'
            }
        });

        // Coba kirim
        const result = await sendWaMessage(settings.wa_target_number, message);

        await prisma.wa_notifications.update({
            where: { id: notif.id },
            data: {
                status: result.success ? 'sent' : 'failed',
                sent_at: result.success ? new Date() : null
            }
        });

        if (!result.success) {
            console.warn(`[WA] Gagal kirim notif stok untuk ${part.name}: ${result.error}`);
        }
    } catch (err) {
        console.error('[WA] triggerWaNotificationIfNeeded error:', err);
    }
};

/**
 * Kirim notifikasi progress servis ke nomor WA pelanggan.
 * Digunakan saat status Work Order berubah ke "dikerjakan" atau "selesai".
 */
export const sendServiceProgressNotification = async (
    customerPhone: string,
    vehiclePlate: string,
    newStatus: string,
    workOrderId: number
): Promise<void> => {
    const statusMessages: Record<string, string> = {
        dikerjakan:
            `🔧 *Update Kendaraan Anda*\n\n` +
            `Kendaraan dengan nomor polisi *${vehiclePlate}* sedang dalam pengerjaan.\n` +
            `Tim mekanik kami sedang menangani kendaraan Anda.\n\n` +
            `Terima kasih telah mempercayakan kendaraan Anda kepada kami! 🙏`,
        selesai:
            `✅ *Kendaraan Siap Diambil!*\n\n` +
            `Kendaraan dengan nomor polisi *${vehiclePlate}* telah selesai dikerjakan dan siap untuk diambil.\n\n` +
            `Silakan datang ke bengkel untuk mengambil kendaraan Anda.\n` +
            `Terima kasih! 🚗`
    };

    const message = statusMessages[newStatus];
    if (!message) return; // Hanya kirim untuk status relevan

    try {
        // Simpan log notifikasi
        const notif = await prisma.wa_notifications.create({
            data: {
                spare_part_id: null,
                wa_number: customerPhone,
                message_body: message,
                status: 'pending'
            }
        });

        const result = await sendWaMessage(customerPhone, message);

        await prisma.wa_notifications.update({
            where: { id: notif.id },
            data: {
                status: result.success ? 'sent' : 'failed',
                sent_at: result.success ? new Date() : null
            }
        });

        if (!result.success) {
            console.warn(`[WA] Gagal kirim notif progress servis WO#${workOrderId}: ${result.error}`);
        }
    } catch (err) {
        console.error('[WA] sendServiceProgressNotification error:', err);
    }
};
