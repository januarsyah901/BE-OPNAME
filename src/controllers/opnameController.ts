import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { getPagination } from '../utils/helpers';

// GET /opnames
export const listOpnames = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const { from, perPage } = getPagination(page);

    try {
        const [data, total] = await Promise.all([
            prisma.opnames.findMany({
                orderBy: { created_at: 'desc' },
                include: {
                    users: { select: { name: true } }
                },
                skip: from,
                take: perPage
            }),
            prisma.opnames.count()
        ]);
        return successResponse(res, data, 'OK', 200, { page, total, per_page: perPage });
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// POST /opnames
export const createOpname = async (req: Request, res: Response) => {
    const { session_name } = req.body;
    if (!session_name) return errorResponse(res, 'VALIDATION_ERROR', 'session_name wajib diisi', 422);

    const userId = (req as any).user?.id ?? null;

    try {
        // Cek apakah ada sesi yang masih open
        const openSession = await prisma.opnames.findFirst({ where: { status: 'open' } });
        if (openSession) {
            return errorResponse(res, 'OPNAME_ALREADY_OPEN', 'Masih ada sesi opname yang belum ditutup', 409);
        }

        const data = await prisma.opnames.create({
            data: {
                session_name,
                status: 'open',
                user_id: userId,
                opened_at: new Date()
            },
            include: { users: { select: { name: true } } }
        });
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
                users: { select: { name: true } },
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
        // Validasi sesi masih open
        const opname = await prisma.opnames.findUnique({ where: { id: Number(id) }, select: { status: true } });
        if (!opname) return errorResponse(res, 'NOT_FOUND', 'Sesi opname tidak ditemukan', 404);
        if (opname.status === 'closed') return errorResponse(res, 'VALIDATION_ERROR', 'Sesi opname sudah ditutup', 400);

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
            update: {
                physical_count: Number(physical_count),
                system_count: part.current_stock,
                updated_at: new Date()
            },
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
    const userId = (req as any).user?.id ?? null;

    try {
        const opname = await prisma.opnames.findUnique({ where: { id: Number(id) }, select: { status: true } });
        if (!opname) return errorResponse(res, 'NOT_FOUND', 'Sesi opname tidak ditemukan', 404);
        if (opname.status === 'closed') return errorResponse(res, 'VALIDATION_ERROR', 'Sesi ini sudah ditutup', 400);

        // Ambil semua item dengan hitungan fisik
        const items = await prisma.opname_items.findMany({
            where: { opname_id: Number(id), physical_count: { not: null } }
        });

        if (items.length > 0) {
            const adjustments = items.filter((item) => item.physical_count !== item.system_count);

            if (adjustments.length > 0) {
                // Buat stock_movements untuk setiap item yang ada selisih
                for (const item of adjustments) {
                    const physCount = item.physical_count ?? item.system_count;
                    const diff = physCount - item.system_count;

                    await prisma.stock_movements.create({
                        data: {
                            spare_part_id: item.spare_part_id,
                            user_id: userId,
                            type: 'opname_adjustment',
                            quantity: Math.abs(diff),
                            stock_before: item.system_count,
                            stock_after: physCount,
                            note: `Adjustment opname #${id}: sistem=${item.system_count}, fisik=${physCount}`,
                            reference_id: Number(id),
                            reference_type: 'opname'
                        }
                    });

                    // Update stok aktual sesuai hitungan fisik
                    await prisma.spare_parts.update({
                        where: { id: item.spare_part_id! },
                        data: { current_stock: physCount, updated_at: new Date() }
                    });
                }
            }
        }

        // Tutup sesi
        const data = await prisma.opnames.update({
            where: { id: Number(id) },
            data: { status: 'closed', closed_at: new Date(), updated_at: new Date() }
        });

        return successResponse(res, {
            ...data,
            summary: {
                total_items: items.length,
                items_adjusted: items.filter((i) => i.physical_count !== i.system_count).length,
                items_ok: items.filter((i) => i.physical_count === i.system_count).length
            }
        }, 'Sesi opname berhasil ditutup dan stok disesuaikan');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};
