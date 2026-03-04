import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';

// GET /customers/:customerId/vehicles
export const listVehicles = async (req: Request, res: Response) => {
    try {
        const data = await prisma.vehicles.findMany({
            where: { customer_id: Number(req.params.customerId) },
            orderBy: { id: 'asc' }
        });
        return successResponse(res, data);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// POST /customers/:customerId/vehicles
export const createVehicle = async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const { plate_number, type, brand, model, year } = req.body;

    if (!plate_number || !type) {
        return errorResponse(res, 'VALIDATION_ERROR', 'plate_number dan type wajib diisi', 422);
    }

    try {
        const data = await prisma.vehicles.create({
            data: { customer_id: Number(customerId), plate_number, type, brand, model, year: year ? Number(year) : null }
        });
        return successResponse(res, data, 'Kendaraan berhasil ditambahkan', 201);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// PUT /vehicles/:id
export const updateVehicle = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { plate_number, type, brand, model, year } = req.body;

    try {
        const data = await prisma.vehicles.update({
            where: { id: Number(id) },
            data: { plate_number, type, brand, model, year: year ? Number(year) : null, updated_at: new Date() }
        });
        return successResponse(res, data, 'Kendaraan berhasil diupdate');
    } catch (e: any) {
        return errorResponse(res, 'NOT_FOUND', 'Kendaraan tidak ditemukan', 404);
    }
};
