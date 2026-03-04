import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';

// GET /notifications/wa
export const listNotifications = async (req: Request, res: Response) => {
    return successResponse(res, [], 'Fitur WA Notification belum diintegrasikan');
};

// POST /notifications/wa/test
export const sendTestNotification = async (req: Request, res: Response) => {
    try {
        const settings = await prisma.settings.findFirst();
        if (!settings?.wa_target_number || !settings?.wa_gateway_token) {
            return errorResponse(res, 'VALIDATION_ERROR', 'WA config belum diset di Settings. Lengkapi wa_target_number dan wa_gateway_token terlebih dahulu.', 422);
        }

        // TODO: Call real WA gateway API (Fonntes/Wablas)
        return successResponse(res, {
            to: settings.wa_target_number,
            message: 'Ini adalah pesan test dari AutoService BE.',
            note: 'Integrasi WA Gateway belum diimplementasikan. Tambahkan API call ke Fonntes/Wablas di sini.'
        }, 'Test notification (dummy response)');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};
