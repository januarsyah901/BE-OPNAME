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
    const { plate_number, type, brand, model, year, frame_number } = req.body;

    if (!brand || !model) {
        return errorResponse(res, 'VALIDATION_ERROR', 'Merek dan Model kendaraan wajib diisi', 422);
    }
    try {
        const data = await prisma.vehicles.create({
            data: { customer_id: Number(customerId), plate_number, type, brand, model, year: year ? Number(year) : null, frame_number }
        });
        return successResponse(res, data, 'Kendaraan berhasil ditambahkan', 201);
    } catch (e: any) {
        if (e.code === 'P2002') {
            return errorResponse(res, 'CONFLICT', 'Nomor plat sudah terdaftar di sistem', 409);
        }
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// PUT /vehicles/:id
export const updateVehicle = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { plate_number, type, brand, model, year, frame_number } = req.body;

    if (brand === '' || model === '') {
        return errorResponse(res, 'VALIDATION_ERROR', 'Merek dan Model kendaraan tidak boleh kosong', 422);
    }

    try {
        const data = await prisma.vehicles.update({
            where: { id: Number(id) },
            data: { plate_number, type, brand, model, year: year ? Number(year) : null, frame_number }
        });
        return successResponse(res, data, 'Kendaraan berhasil diupdate');
    } catch (e: any) {
        return errorResponse(res, 'NOT_FOUND', 'Kendaraan tidak ditemukan', 404);
    }
};
