import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';

// GET /opnames
export const listOpnames = async (req: Request, res: Response) => {
    try {
        const data = await prisma.opnames.findMany({ orderBy: { created_at: 'desc' } });
        return successResponse(res, data);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// POST /opnames
export const createOpname = async (req: Request, res: Response) => {
    const { session_name } = req.body;
    if (!session_name) return errorResponse(res, 'VALIDATION_ERROR', 'session_name wajib diisi', 422);

    try {
        // Cek apakah ada sesi yang masih open
        const openSession = await prisma.opnames.findFirst({ where: { status: 'open' } });
        if (openSession) {
            return errorResponse(res, 'OPNAME_ALREADY_OPEN', 'Masih ada sesi opname yang belum ditutup', 409);
        }

        const data = await prisma.opnames.create({ data: { session_name, status: 'open' } });
        return successResponse(res, data, 'Sesi opname berhasil dibuat', 201);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// GET /opnames/:id
export const getOpname = async (req: Request, res: Response) => {
    try {
        const data = await prisma.opnames.findUnique({
            where: { id: Number(req.params.id) },
            include: {
                opname_items: {
                    include: {
                        spare_parts: { select: { name: true, sku: true, current_stock: true } }
                    }
                }
            }
        });
        if (!data) return errorResponse(res, 'NOT_FOUND', 'Sesi opname tidak ditemukan', 404);
        return successResponse(res, data);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// POST /opnames/:id/items
export const addOpnameItem = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { spare_part_id, physical_count } = req.body;

    if (!spare_part_id || physical_count === undefined) {
        return errorResponse(res, 'VALIDATION_ERROR', 'spare_part_id dan physical_count wajib diisi', 422);
    }

    try {
        const part = await prisma.spare_parts.findUnique({
            where: { id: Number(spare_part_id) },
            select: { current_stock: true }
        });
        if (!part) return errorResponse(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);

        // Upsert: update if exists, create if not
        const data = await prisma.opname_items.upsert({
            where: {
                opname_id_spare_part_id: {
                    opname_id: Number(id),
                    spare_part_id: Number(spare_part_id)
                }
            },
            update: { physical_count: Number(physical_count), system_count: part.current_stock },
            create: {
                opname_id: Number(id),
                spare_part_id: Number(spare_part_id),
                system_count: part.current_stock,
                physical_count: Number(physical_count)
            }
        });

        return successResponse(res, data, 'Hitungan fisik berhasil disimpan');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// PUT /opnames/:id/items/:item_id
export const updateOpnameItem = async (req: Request, res: Response) => {
    const { item_id } = req.params;
    const { physical_count } = req.body;

    if (physical_count === undefined) return errorResponse(res, 'VALIDATION_ERROR', 'physical_count wajib diisi', 422);

    try {
        const data = await prisma.opname_items.update({
            where: { id: Number(item_id) },
            data: { physical_count: Number(physical_count), updated_at: new Date() }
        });
        return successResponse(res, data, 'Hitungan fisik diupdate');
    } catch (e: any) {
        return errorResponse(res, 'NOT_FOUND', 'Item opname tidak ditemukan', 404);
    }
};

// POST /opnames/:id/close
export const closeOpname = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const opname = await prisma.opnames.findUnique({ where: { id: Number(id) }, select: { status: true } });
        if (!opname) return errorResponse(res, 'NOT_FOUND', 'Sesi opname tidak ditemukan', 404);
        if (opname.status === 'closed') return errorResponse(res, 'VALIDATION_ERROR', 'Sesi ini sudah ditutup', 400);

        // Ambil semua item dengan selisih
        const items = await prisma.opname_items.findMany({
            where: { opname_id: Number(id), physical_count: { not: null } }
        });

        if (items.length > 0) {
            const adjustments = items.filter((item) => item.physical_count !== item.system_count);

            if (adjustments.length > 0) {
                await prisma.stock_movements.createMany({
                    data: adjustments.map((item) => ({
                        spare_part_id: item.spare_part_id,
                        type: 'opname_adjustment',
                        quantity: Math.abs((item.physical_count ?? 0) - item.system_count),
                        note: `Adjustment opname #${id}: sistem=${item.system_count}, fisik=${item.physical_count}`
                    }))
                });

                // Update stok aktual sesuai hitungan fisik
                for (const item of adjustments) {
                    await prisma.spare_parts.update({
                        where: { id: item.spare_part_id! },
                        data: { current_stock: item.physical_count !== null ? item.physical_count : item.system_count }
                    });
                }
            }
        }

        // Tutup sesi
        const data = await prisma.opnames.update({
            where: { id: Number(id) },
            data: { status: 'closed', closed_at: new Date() }
        });

        return successResponse(res, data, 'Sesi opname berhasil ditutup dan stok disesuaikan');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};
