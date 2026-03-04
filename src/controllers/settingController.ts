import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';

// GET /settings
export const getSettings = async (req: Request, res: Response) => {
    try {
        const data = await prisma.settings.findFirst();
        if (!data) return errorResponse(res, 'NOT_FOUND', 'Settings tidak ditemukan', 404);
        return successResponse(res, data);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// PUT /settings
export const updateSettings = async (req: Request, res: Response) => {
    const { name, address, phone, wa_gateway_token, wa_target_number } = req.body;

    try {
        // Always update row id=1 (singleton pattern)
        const data = await prisma.settings.update({
            where: { id: 1 },
            data: { name, address, phone, wa_gateway_token, wa_target_number, updated_at: new Date() }
        });
        return successResponse(res, data, 'Settings berhasil diupdate');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};
