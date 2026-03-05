import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';

// GET /settings
export const getSettings = async (req: Request, res: Response) => {
    try {
        const data = await prisma.bengkel_profile.findFirst();
        if (!data) return errorResponse(res, 'NOT_FOUND', 'Profile bengkel tidak ditemukan', 404);
        return successResponse(res, data);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// PUT /settings
export const updateSettings = async (req: Request, res: Response) => {
    const { name, address, phone, logo_url, wa_gateway_token, wa_target_number } = req.body;

    try {
        // Always update row id=1 (singleton pattern)
        const data = await prisma.bengkel_profile.upsert({
            where: { id: 1 },
            update: { name, address, phone, logo_url, wa_gateway_token, wa_target_number },
            create: { id: 1, name: name || 'Bengkel AutoService', address, phone, logo_url, wa_gateway_token, wa_target_number }
        });
        return successResponse(res, data, 'Settings berhasil diupdate');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};
