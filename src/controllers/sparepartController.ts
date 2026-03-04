import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { generateSKU, getPagination } from '../utils/helpers';

// GET /spare-parts
export const listSpareParts = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const { from, perPage } = getPagination(page);
    const { category_id, low_stock, search } = req.query;

    try {
        const where: any = { deleted_at: null };
        if (category_id) where.category_id = Number(category_id);
        if (search) where.name = { contains: search, mode: 'insensitive' };

        const [allData, total] = await Promise.all([
            prisma.spare_parts.findMany({
                where,
                include: { categories: { select: { name: true } } },
                orderBy: { id: 'asc' },
                skip: from,
                take: perPage
            }),
            prisma.spare_parts.count({ where })
        ]);

        let result: typeof allData = allData;
        if (low_stock === 'true') {
            result = allData.filter((item) => item.current_stock < item.minimum_stock);
        }

        return successResponse(res, result, 'OK', 200, { page, total, per_page: perPage });
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// POST /spare-parts
export const createSparePart = async (req: Request, res: Response) => {
    const { category_id, name, cost_price, sell_price, current_stock, minimum_stock, unit } = req.body;
    if (!name || cost_price === undefined || sell_price === undefined) {
        return errorResponse(res, 'VALIDATION_ERROR', 'name, cost_price, sell_price wajib diisi', 422);
    }

    try {
        // Insert first to get ID, then update SKU
        const inserted = await prisma.spare_parts.create({
            data: {
                category_id: category_id ? Number(category_id) : null,
                name,
                cost_price: Number(cost_price),
                sell_price: Number(sell_price),
                current_stock: current_stock !== undefined ? Number(current_stock) : 0,
                minimum_stock: minimum_stock !== undefined ? Number(minimum_stock) : 0,
                unit: unit || 'pcs',
                sku: 'TEMP',
                barcode_value: 'TEMP'
            }
        });

        // Get category name for SKU prefix
        let categoryName = 'GEN';
        if (category_id) {
            const cat = await prisma.categories.findUnique({ where: { id: Number(category_id) } });
            if (cat) categoryName = cat.name;
        }

        const sku = generateSKU(categoryName, inserted.id);
        const data = await prisma.spare_parts.update({
            where: { id: inserted.id },
            data: { sku, barcode_value: sku }
        });

        return successResponse(res, data, 'Spare part berhasil ditambahkan', 201);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// GET /spare-parts/:id
export const getSparePart = async (req: Request, res: Response) => {
    try {
        const data = await prisma.spare_parts.findFirst({
            where: { id: Number(req.params.id), deleted_at: null },
            include: { categories: { select: { name: true } }, stock_movements: true }
        });
        if (!data) return errorResponse(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);
        return successResponse(res, data);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// PUT /spare-parts/:id
export const updateSparePart = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { category_id, name, cost_price, sell_price, minimum_stock, unit } = req.body;

    try {
        const existing = await prisma.spare_parts.findFirst({ where: { id: Number(id), deleted_at: null } });
        if (!existing) return errorResponse(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);

        const data = await prisma.spare_parts.update({
            where: { id: Number(id) },
            data: {
                category_id: category_id !== undefined ? Number(category_id) : undefined,
                name,
                cost_price: cost_price !== undefined ? Number(cost_price) : undefined,
                sell_price: sell_price !== undefined ? Number(sell_price) : undefined,
                minimum_stock: minimum_stock !== undefined ? Number(minimum_stock) : undefined,
                unit,
                updated_at: new Date()
            }
        });
        return successResponse(res, data, 'Spare part berhasil diupdate');
    } catch (e: any) {
        return errorResponse(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);
    }
};

// DELETE /spare-parts/:id (soft delete)
export const deleteSparePart = async (req: Request, res: Response) => {
    try {
        const existing = await prisma.spare_parts.findFirst({ where: { id: Number(req.params.id), deleted_at: null } });
        if (!existing) return errorResponse(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);

        await prisma.spare_parts.update({
            where: { id: Number(req.params.id) },
            data: { deleted_at: new Date() }
        });
        return successResponse(res, null, 'Spare part berhasil dihapus');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// GET /spare-parts/:id/barcode
export const getBarcode = async (req: Request, res: Response) => {
    try {
        const data = await prisma.spare_parts.findUnique({
            where: { id: Number(req.params.id) },
            select: { id: true, sku: true, barcode_value: true, barcode_image_url: true }
        });
        if (!data) return errorResponse(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);
        return successResponse(res, data);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// POST /spare-parts/:id/barcode/print
export const printBarcode = async (req: Request, res: Response) => {
    try {
        const data = await prisma.spare_parts.findUnique({
            where: { id: Number(req.params.id) },
            select: { id: true, sku: true, barcode_value: true, name: true }
        });
        if (!data) return errorResponse(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);
        return successResponse(res, { message: 'PDF generation not yet implemented', barcode_value: data.barcode_value });
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};
