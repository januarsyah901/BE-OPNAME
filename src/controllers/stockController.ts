import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { getPagination } from '../utils/helpers';
import { triggerWaNotificationIfNeeded } from '../services/waNotificationService';

// GET /stock-movements
export const listMovements = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const { from, perPage } = getPagination(page);
    const { spare_part_id, type } = req.query;

    try {
        const where: any = {};
        if (spare_part_id) where.spare_part_id = Number(spare_part_id);
        if (type) where.type = String(type);

        const [data, total] = await Promise.all([
            prisma.stock_movements.findMany({
                where,
                include: { spare_parts: { select: { name: true, sku: true } } },
                orderBy: { created_at: 'desc' },
                skip: from,
                take: perPage
            }),
            prisma.stock_movements.count({ where })
        ]);

        return successResponse(res, data, 'OK', 200, { page, total, per_page: perPage });
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// POST /stock/in
export const stockIn = async (req: Request, res: Response) => {
    const { spare_part_id, quantity, note } = req.body;
    if (!spare_part_id || !quantity) {
        return errorResponse(res, 'VALIDATION_ERROR', 'spare_part_id dan quantity wajib diisi', 422);
    }

    const userId = (req as any).user?.id ?? null;

    try {
        const part = await prisma.spare_parts.findUnique({
            where: { id: Number(spare_part_id) },
            select: { current_stock: true, name: true, minimum_stock: true }
        });
        if (!part) return errorResponse(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);

        const stockBefore = part.current_stock;
        const stockAfter = stockBefore + Number(quantity);

        // Update stok
        await prisma.spare_parts.update({
            where: { id: Number(spare_part_id) },
            data: { current_stock: stockAfter, updated_at: new Date() }
        });

        // Catat movement dengan stock_before & stock_after
        const movement = await prisma.stock_movements.create({
            data: {
                spare_part_id: Number(spare_part_id),
                user_id: userId,
                type: 'masuk',
                quantity: Number(quantity),
                stock_before: stockBefore,
                stock_after: stockAfter,
                note,
                reference_type: 'manual'
            }
        });

        // Trigger WA notif jika stok masih di bawah minimum
        await triggerWaNotificationIfNeeded(Number(spare_part_id), stockAfter);

        return successResponse(res, {
            movement,
            spare_part: { id: Number(spare_part_id), name: part.name, current_stock: stockAfter }
        }, 'Stok masuk berhasil dicatat');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// POST /stock/out
export const stockOut = async (req: Request, res: Response) => {
    const { spare_part_id, quantity, note } = req.body;
    if (!spare_part_id || !quantity) {
        return errorResponse(res, 'VALIDATION_ERROR', 'spare_part_id dan quantity wajib diisi', 422);
    }

    const userId = (req as any).user?.id ?? null;

    try {
        const part = await prisma.spare_parts.findUnique({
            where: { id: Number(spare_part_id) },
            select: { current_stock: true, name: true, minimum_stock: true }
        });
        if (!part) return errorResponse(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);
        if (part.current_stock < Number(quantity)) {
            return errorResponse(res, 'STOCK_INSUFFICIENT', `Stok tidak cukup. Stok tersedia: ${part.current_stock}`, 422);
        }

        const stockBefore = part.current_stock;
        const stockAfter = stockBefore - Number(quantity);

        // Update stok
        await prisma.spare_parts.update({
            where: { id: Number(spare_part_id) },
            data: { current_stock: stockAfter, updated_at: new Date() }
        });

        // Catat movement dengan stock_before & stock_after
        const movement = await prisma.stock_movements.create({
            data: {
                spare_part_id: Number(spare_part_id),
                user_id: userId,
                type: 'keluar',
                quantity: Number(quantity),
                stock_before: stockBefore,
                stock_after: stockAfter,
                note,
                reference_type: 'manual'
            }
        });

        // Trigger WA notif jika stok di bawah minimum
        await triggerWaNotificationIfNeeded(Number(spare_part_id), stockAfter);

        return successResponse(res, {
            movement,
            spare_part: { id: Number(spare_part_id), name: part.name, current_stock: stockAfter }
        }, 'Stok keluar berhasil dicatat');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};
