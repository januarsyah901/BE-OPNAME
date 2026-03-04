import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { getPagination } from '../utils/helpers';

// GET /notifications/wa — List log notifikasi WA
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

// POST /notifications/wa/test — Kirim notif WA test ke nomor owner
export const sendTestNotification = async (req: Request, res: Response) => {
    try {
        const settings = await prisma.settings.findFirst();
        if (!settings?.wa_target_number || !settings?.wa_gateway_token) {
            return errorResponse(
                res,
                'VALIDATION_ERROR',
                'WA config belum diset di Settings. Lengkapi wa_target_number dan wa_gateway_token terlebih dahulu.',
                422
            );
        }

        const message = `✅ *Test Notifikasi AutoService*\n\nIni adalah pesan test dari sistem inventori bengkel.\nJika Anda menerima pesan ini, WA Gateway sudah terkonfigurasi dengan benar.`;

        // Simpan log notifikasi test
        const notif = await prisma.wa_notifications.create({
            data: {
                spare_part_id: null,
                wa_number: settings.wa_target_number,
                message_body: message,
                status: 'pending'
            }
        });

        // TODO: Implementasi actual API call ke WA Gateway (Fonnte/Wablas)
        // Contoh untuk Fonnte:
        // const response = await axios.post('https://api.fonnte.com/send', {
        //   target: settings.wa_target_number,
        //   message
        // }, { headers: { Authorization: settings.wa_gateway_token } });
        // await prisma.wa_notifications.update({ where: { id: notif.id }, data: { status: 'sent', sent_at: new Date() } });

        return successResponse(res, {
            notification_id: notif.id,
            to: settings.wa_target_number,
            message,
            status: 'pending',
            note: 'Log notifikasi sudah disimpan. Integrasi WA Gateway (Fonnte/Wablas) perlu diaktifkan di services/waNotificationService.ts'
        }, 'Test notification berhasil dijadwalkan');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};
