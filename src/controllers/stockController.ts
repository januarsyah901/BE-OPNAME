import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';

// Helper: update stok spare part
const adjustStock = async (spare_part_id: number, delta: number): Promise<boolean> => {
    const part = await prisma.spare_parts.findUnique({ where: { id: spare_part_id }, select: { current_stock: true } });
    if (!part) return false;
    const newStock = part.current_stock + delta;
    if (newStock < 0) return false;
    await prisma.spare_parts.update({ where: { id: spare_part_id }, data: { current_stock: newStock } });
    return true;
};

// GET /stock-movements
export const listMovements = async (req: Request, res: Response) => {
    const { spare_part_id, type } = req.query;

    try {
        const where: any = {};
        if (spare_part_id) where.spare_part_id = Number(spare_part_id);
        if (type) where.type = String(type);

        const data = await prisma.stock_movements.findMany({
            where,
            include: { spare_parts: { select: { name: true, sku: true } } },
            orderBy: { created_at: 'desc' }
        });
        return successResponse(res, data);
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

    try {
        const ok = await adjustStock(Number(spare_part_id), Number(quantity));
        if (!ok) return errorResponse(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);

        const movement = await prisma.stock_movements.create({
            data: { spare_part_id: Number(spare_part_id), type: 'in', quantity: Number(quantity), note }
        });

        const updatedPart = await prisma.spare_parts.findUnique({
            where: { id: Number(spare_part_id) },
            select: { id: true, name: true, current_stock: true }
        });

        return successResponse(res, { movement, spare_part: updatedPart }, 'Stok masuk berhasil dicatat');
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

    try {
        const part = await prisma.spare_parts.findUnique({ where: { id: Number(spare_part_id) }, select: { current_stock: true } });
        if (!part) return errorResponse(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);
        if (part.current_stock < Number(quantity)) {
            return errorResponse(res, 'STOCK_INSUFFICIENT', `Stok tidak cukup. Stok tersedia: ${part.current_stock}`, 422);
        }

        await adjustStock(Number(spare_part_id), -Number(quantity));

        const movement = await prisma.stock_movements.create({
            data: { spare_part_id: Number(spare_part_id), type: 'out', quantity: Number(quantity), note }
        });

        const updatedPart = await prisma.spare_parts.findUnique({
            where: { id: Number(spare_part_id) },
            select: { id: true, name: true, current_stock: true }
        });

        return successResponse(res, { movement, spare_part: updatedPart }, 'Stok keluar berhasil dicatat');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};
