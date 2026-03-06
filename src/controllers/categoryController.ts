import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';

export const listCategories = async (req: Request, res: Response) => {
    try {
        const data = await prisma.categories.findMany({ orderBy: { name: 'asc' } });
        return successResponse(res, data);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

export const createCategory = async (req: Request, res: Response) => {
    const { name, description } = req.body;
    if (!name) return errorResponse(res, 'VALIDATION_ERROR', 'name wajib diisi', 422);

    try {
        const data = await prisma.categories.create({ data: { name, description } });
        return successResponse(res, data, 'Kategori berhasil dibuat', 201);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

export const updateCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description } = req.body;

    try {
        const data = await prisma.categories.update({
            where: { id: Number(id) },
            data: { name, description }
        });
        return successResponse(res, data, 'Kategori berhasil diupdate');
    } catch (e: any) {
        return errorResponse(res, 'NOT_FOUND', 'Kategori tidak ditemukan', 404);
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        await prisma.categories.delete({ where: { id: Number(req.params.id) } });
        return successResponse(res, null, 'Kategori berhasil dihapus');
    } catch (e: any) {
        return errorResponse(res, 'NOT_FOUND', 'Kategori tidak ditemukan', 404);
    }
};
