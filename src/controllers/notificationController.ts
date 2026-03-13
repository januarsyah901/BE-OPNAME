import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { getPagination } from '../utils/helpers';
import {
    getWaStatus,
    getWaQr,
    getWaStatusFromDb,
    getWaQrFromDb,
    restartWaClient,
    sendWaMessage
} from '../services/waClientService';

// ===========================================================================
// WA Log Endpoints
// ===========================================================================

/**
 * GET /notifications/wa
 * List log notifikasi WA (paginasi, filter status)
 */
export const listNotifications = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const { from, perPage } = getPagination(page);
    const { status } = req.query;

    try {
        const where: any = {};
        if (status) where.status = String(status);

        const [data, total] = await Promise.all([
            prisma.wa_notifications.findMany({
                where,
                include: {
                    spare_parts: { select: { name: true, sku: true } }
                },
                orderBy: { created_at: 'desc' },
                skip: from,
                take: perPage
            }),
            prisma.wa_notifications.count({ where })
        ]);

        return successResponse(res, data, 'OK', 200, { page, total, per_page: perPage });
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// ===========================================================================
// WA Client / Gateway Endpoints
// ===========================================================================

/**
 * GET /notifications/wa/status
 * Status koneksi WA Web.js client saat ini
 */
export const getWaClientStatus = async (req: Request, res: Response) => {
    const data = await getWaStatusFromDb();
    return successResponse(res, {
        ...data,
        note: data.status === 'disconnected'
            ? 'WA Worker tidak aktif. Jalankan `npm run wa:worker` di lokal untuk mengaktifkan notifikasi WA.'
            : null
    }, 'OK');
};

/**
 * GET /notifications/wa/qr
 * Ambil QR code (base64 data URL) untuk di-scan via WhatsApp
 */
export const getWaQrCode = async (req: Request, res: Response) => {
    const { status } = await getWaStatusFromDb();

    if (status === 'ready' || status === 'authenticated') {
        return successResponse(res, { status, qr: null }, 'WA sudah terkoneksi, tidak perlu scan QR.');
    }

    /* Kita hapus cek disconnected di sini agar user tetap bisa dapet QR kalau worker nyala belakangan
    if (status === 'disconnected') {
        return errorResponse(
            res,
            'WA_WORKER_NOT_RUNNING',
            'WA Worker tidak aktif. Jalankan `npm run wa:worker` di lokal untuk memulai koneksi dan mendapatkan QR.',
            503
        );
    }
    */

    const qr = await getWaQrFromDb();
    if (!qr) {
        return errorResponse(
            res,
            'QR_NOT_READY',
            'QR belum tersedia atau sudah expired. Tunggu sebentar lalu coba lagi, atau restart client.',
            404
        );
    }

    return successResponse(res, { status, qr }, 'QR tersedia, silakan scan dengan WhatsApp.');
};

/**
 * POST /notifications/wa/restart
 * Restart WA client (menghapus sesi lama + inisialisasi ulang / scan QR baru)
 */
export const restartWa = async (req: Request, res: Response) => {
    try {
        restartWaClient();
        return successResponse(res, { status: 'initializing' }, 'WA client sedang di-restart. Tunggu QR baru dalam beberapa detik.');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

/**
 * POST /notifications/wa/send
 * Kirim pesan WA manual (dimasukkan ke antrian)
 */
export const sendManualNotification = async (req: Request, res: Response) => {
    const { phone, message } = req.body;

    if (!phone || !message) {
        return errorResponse(res, 'VALIDATION_ERROR', 'Phone and message are required', 422);
    }

    try {
        const { status } = await getWaStatusFromDb();
        if (status !== 'ready') {
            return errorResponse(
                res,
                'WA_NOT_READY',
                `WA client belum siap (status: ${status}). Scan QR terlebih dahulu via Dashboard.`,
                422
            );
        }

        // Masukkan ke antrian (pending)
        const notif = await prisma.wa_notifications.create({
            data: {
                wa_number: phone.replace(/\D/g, ''),
                message_body: message,
                status: 'pending'
            }
        });

        return successResponse(res, {
            notification_id: notif.id,
            to: phone,
            status: 'pending'
        }, 'Pesan telah ditambahkan ke antrian pengiriman (Bot).');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

/**
 * POST /notifications/wa/test
 * Kirim pesan WA test ke nomor owner (dari settings)
 */
export const sendTestNotification = async (req: Request, res: Response) => {
    try {
        const { status } = await getWaStatusFromDb();
        if (status !== 'ready') {
            return errorResponse(
                res,
                'WA_NOT_READY',
                `WA client belum siap (status: ${status}). Scan QR terlebih dahulu via Dashboard.`,
                422
            );
        }

        const settings = await prisma.bengkel_profile.findFirst();
        if (!settings?.wa_target_number) {
            return errorResponse(
                res,
                'VALIDATION_ERROR',
                'wa_target_number belum diset di Settings.',
                422
            );
        }

        const message =
            `✅ *Test Notifikasi AutoService*\n\n` +
            `Ini adalah pesan test dari sistem inventori bengkel.\n` +
            `Jika Anda menerima pesan ini, WhatsApp Gateway sudah terkonfigurasi dengan benar.`;

        // Masukkan ke antrian (pending)
        // Biarkan WA Worker yang memproses pengirimannya secara asinkron
        const notif = await prisma.wa_notifications.create({
            data: {
                spare_part_id: null,
                wa_number: settings.wa_target_number,
                message_body: message,
                status: 'pending'
            }
        });

        return successResponse(res, {
            notification_id: notif.id,
            to: settings.wa_target_number,
            status: 'pending'
        }, 'Pesan test telah ditambahkan ke antrian pengiriman (Worker). Cek log dalam beberapa detik.');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

/**
 * POST /notifications/wa/retry/:id
 * Retry kirim notifikasi yang gagal (status: failed)
 */
export const retryNotification = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const notif = await prisma.wa_notifications.findUnique({
            where: { id: Number(id) }
        });

        if (!notif) {
            return errorResponse(res, 'NOT_FOUND', 'Notifikasi tidak ditemukan', 404);
        }

        if (notif.status === 'sent') {
            return errorResponse(res, 'VALIDATION_ERROR', 'Notifikasi ini sudah berhasil dikirim sebelumnya', 422);
        }

        const { status } = await getWaStatusFromDb();
        if (status !== 'ready') {
            return errorResponse(
                res,
                'WA_NOT_READY',
                `WA client belum siap (status: ${status}). Scan QR terlebih dahulu.`,
                422
            );
        }

        // Cukup update ke pending. Worker akan otomatis pick up di siklus polling berikutnya.
        const updated = await prisma.wa_notifications.update({
            where: { id: Number(id) },
            data: { 
                status: 'pending',
                sent_at: null // Reset jika sbelumnya ada
            }
        });

        return successResponse(res, updated, 'Notifikasi telah dimasukkan kembali ke antrian (Worker).');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};
/**
 * DELETE /notifications/wa
 * Hapus semua log notifikasi
 */
export const clearNotifications = async (req: Request, res: Response) => {
    try {
        await prisma.wa_notifications.deleteMany();
        return successResponse(res, null, 'Semua log notifikasi berhasil dihapus');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};
