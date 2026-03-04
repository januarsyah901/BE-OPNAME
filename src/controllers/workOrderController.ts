import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { getPagination } from '../utils/helpers';
import { sendServiceProgressNotification } from '../services/waClientService';

// ===========================================================================
// GET /work-orders
// ===========================================================================
export const listWorkOrders = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const { from, perPage } = getPagination(page);
    const { status, date } = req.query;

    try {
        const where: any = { deleted_at: null };
        if (status) where.status = String(status);
        if (date) {
            const d = new Date(String(date));
            const nextDay = new Date(d);
            nextDay.setDate(nextDay.getDate() + 1);
            where.waktu_masuk = { gte: d, lt: nextDay };
        }

        const [data, total] = await Promise.all([
            prisma.work_orders.findMany({
                where,
                include: {
                    customers: { select: { id: true, name: true, phone: true } },
                    vehicles: { select: { id: true, plate_number: true, type: true, brand: true, model: true } }
                },
                orderBy: { waktu_masuk: 'desc' },
                skip: from,
                take: perPage
            }),
            prisma.work_orders.count({ where })
        ]);

        return successResponse(res, data, 'OK', 200, { page, total, per_page: perPage });
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// ===========================================================================
// POST /work-orders
// ===========================================================================
export const createWorkOrder = async (req: Request, res: Response) => {
    const {
        customer_id,
        vehicle_id,
        layanan,
        keluhan,
        estimasi_biaya,
        estimasi_selesai,
        menginap,
        mekanik
    } = req.body;

    if (!customer_id || !vehicle_id || !layanan) {
        return errorResponse(res, 'VALIDATION_ERROR', 'customer_id, vehicle_id, dan layanan wajib diisi', 422);
    }

    try {
        const wo = await prisma.work_orders.create({
            data: {
                customer_id: Number(customer_id),
                vehicle_id: Number(vehicle_id),
                layanan: String(layanan),
                keluhan: keluhan ?? null,
                status: 'menunggu',
                mekanik: mekanik ?? null,
                estimasi_biaya: estimasi_biaya ? parseFloat(estimasi_biaya) : 0,
                estimasi_selesai: estimasi_selesai ?? null,
                menginap: menginap === true || menginap === 'true',
                waktu_masuk: new Date(),
                created_at: new Date()
            },
            include: {
                customers: { select: { id: true, name: true, phone: true } },
                vehicles: { select: { id: true, plate_number: true, type: true } }
            }
        });

        return successResponse(res, wo, 'Work order berhasil dibuat', 201);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// ===========================================================================
// GET /work-orders/:id
// ===========================================================================
export const getWorkOrder = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const wo = await prisma.work_orders.findFirst({
            where: { id: Number(id), deleted_at: null },
            include: {
                customers: { select: { id: true, name: true, phone: true, email: true } },
                vehicles: { select: { id: true, plate_number: true, type: true, brand: true, model: true, year: true } }
            }
        });

        if (!wo) return errorResponse(res, 'NOT_FOUND', 'Work order tidak ditemukan', 404);

        return successResponse(res, wo, 'OK');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// ===========================================================================
// PUT /work-orders/:id
// ===========================================================================
export const updateWorkOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { layanan, keluhan, estimasi_biaya, estimasi_selesai, menginap, mekanik } = req.body;

    try {
        const existing = await prisma.work_orders.findFirst({
            where: { id: Number(id), deleted_at: null }
        });
        if (!existing) return errorResponse(res, 'NOT_FOUND', 'Work order tidak ditemukan', 404);

        const updated = await prisma.work_orders.update({
            where: { id: Number(id) },
            data: {
                ...(layanan !== undefined && { layanan: String(layanan) }),
                ...(keluhan !== undefined && { keluhan }),
                ...(estimasi_biaya !== undefined && { estimasi_biaya: parseFloat(estimasi_biaya) }),
                ...(estimasi_selesai !== undefined && { estimasi_selesai }),
                ...(menginap !== undefined && { menginap: menginap === true || menginap === 'true' }),
                ...(mekanik !== undefined && { mekanik })
            },
            include: {
                customers: { select: { id: true, name: true, phone: true } },
                vehicles: { select: { plate_number: true } }
            }
        });

        return successResponse(res, updated, 'Work order berhasil diupdate');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// ===========================================================================
// PATCH /work-orders/:id/status
// Update status + trigger notif WA ke pelanggan jika status = "dikerjakan" / "selesai"
// ===========================================================================
export const updateWorkOrderStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['menunggu', 'dikerjakan', 'menunggu_sparepart', 'selesai'];
    if (!status || !validStatuses.includes(status)) {
        return errorResponse(
            res,
            'VALIDATION_ERROR',
            `Status tidak valid. Gunakan: ${validStatuses.join(' | ')}`,
            422
        );
    }

    try {
        const wo = await prisma.work_orders.findFirst({
            where: { id: Number(id), deleted_at: null },
            include: {
                customers: { select: { phone: true, name: true } },
                vehicles: { select: { plate_number: true } }
            }
        });

        if (!wo) return errorResponse(res, 'NOT_FOUND', 'Work order tidak ditemukan', 404);

        const updated = await prisma.work_orders.update({
            where: { id: Number(id) },
            data: { status }
        });

        // Trigger notif WA ke pelanggan saat status berubah ke dikerjakan / selesai
        if (
            (status === 'dikerjakan' || status === 'selesai') &&
            wo.customers?.phone
        ) {
            // Tidak di-await agar tidak blocking response
            sendServiceProgressNotification(
                wo.customers.phone,
                wo.vehicles?.plate_number ?? 'N/A',
                status,
                Number(id)
            ).catch((err) => console.error('[WO] WA notif error:', err));
        }

        return successResponse(res, updated, `Status work order diubah ke "${status}"`);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// ===========================================================================
// PATCH /work-orders/:id/mechanic
// ===========================================================================
export const assignMechanic = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { mekanik } = req.body;

    if (!mekanik) {
        return errorResponse(res, 'VALIDATION_ERROR', 'Nama mekanik wajib diisi', 422);
    }

    try {
        const existing = await prisma.work_orders.findFirst({
            where: { id: Number(id), deleted_at: null }
        });
        if (!existing) return errorResponse(res, 'NOT_FOUND', 'Work order tidak ditemukan', 404);

        const updated = await prisma.work_orders.update({
            where: { id: Number(id) },
            data: { mekanik: String(mekanik) }
        });

        return successResponse(res, updated, `Mekanik "${mekanik}" berhasil ditugaskan`);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// ===========================================================================
// DELETE /work-orders/:id (soft delete)
// ===========================================================================
export const deleteWorkOrder = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const existing = await prisma.work_orders.findFirst({
            where: { id: Number(id), deleted_at: null }
        });
        if (!existing) return errorResponse(res, 'NOT_FOUND', 'Work order tidak ditemukan', 404);

        await prisma.work_orders.update({
            where: { id: Number(id) },
            data: { deleted_at: new Date() }
        });

        return successResponse(res, null, 'Work order berhasil dihapus');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};
