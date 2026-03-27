import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';

// GET /service-bundles
export const listServiceBundles = async (req: Request, res: Response) => {
    try {
        const data = await prisma.service_bundles.findMany({
            include: { items: true },
            orderBy: { id: 'asc' }
        });
        return successResponse(res, data);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// POST /service-bundles
export const createServiceBundle = async (req: Request, res: Response) => {
    const { name, description, price, items } = req.body;

    if (!name || price === undefined) {
        return errorResponse(res, 'VALIDATION_ERROR', 'name dan price wajib diisi', 422);
    }

    try {
        const data = await prisma.service_bundles.create({
            data: {
                name,
                description,
                price: Number(price),
                items: {
                    create: items?.map((it: string) => ({ task_name: it })) || []
                }
            },
            include: { items: true }
        });
        return successResponse(res, data, 'Paket service berhasil dibuat', 201);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// GET /service-bundles/:id
export const getServiceBundle = async (req: Request, res: Response) => {
    try {
        const data = await prisma.service_bundles.findUnique({
            where: { id: Number(req.params.id) },
            include: { items: true }
        });
        if (!data) return errorResponse(res, 'NOT_FOUND', 'Paket service tidak ditemukan', 404);
        return successResponse(res, data);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// PUT /service-bundles/:id
export const updateServiceBundle = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, price, items } = req.body;

    try {
        // Delete old items first then create new ones or handle update logic
        // For simplicity, we delete and recreate
        await prisma.service_bundle_items.deleteMany({
            where: { bundle_id: Number(id) }
        });

        const data = await prisma.service_bundles.update({
            where: { id: Number(id) },
            data: {
                name,
                description,
                price: price !== undefined ? Number(price) : undefined,
                items: {
                    create: items?.map((it: string) => ({ task_name: it })) || []
                }
            },
            include: { items: true }
        });
        return successResponse(res, data, 'Paket service berhasil diupdate');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// DELETE /service-bundles/:id
export const deleteServiceBundle = async (req: Request, res: Response) => {
    try {
        await prisma.service_bundles.delete({
            where: { id: Number(req.params.id) }
        });
        return successResponse(res, null, 'Paket service berhasil dihapus');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};
