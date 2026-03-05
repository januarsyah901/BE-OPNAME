import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';

// GET /users
export const listUsers = async (req: Request, res: Response) => {
    try {
        const data = await prisma.users.findMany({
            where: { deleted_at: null },
            select: { id: true, name: true, username: true, role: true, is_active: true, created_at: true },
            orderBy: { id: 'asc' }
        });
        return successResponse(res, data);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// POST /users
export const createUser = async (req: Request, res: Response) => {
    const { name, username, password, role } = req.body;
    if (!name || !username || !password || !role) {
        return errorResponse(res, 'VALIDATION_ERROR', 'name, username, password, role wajib diisi', 422);
    }

    try {
        const password_hash = bcrypt.hashSync(password, 10);
        const data = await prisma.users.create({
            data: { name, username, password_hash, role },
            select: { id: true, name: true, username: true, role: true }
        });
        return successResponse(res, data, 'User berhasil dibuat', 201);
    } catch (e: any) {
        if (e.code === 'P2002') {
            return errorResponse(res, 'CONFLICT', 'Username sudah digunakan', 409);
        }
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// GET /users/:id
export const getUser = async (req: Request, res: Response) => {
    try {
        const data = await prisma.users.findFirst({
            where: { id: Number(req.params.id), deleted_at: null },
            select: { id: true, name: true, username: true, role: true, is_active: true, created_at: true }
        });
        if (!data) return errorResponse(res, 'NOT_FOUND', 'User tidak ditemukan', 404);
        return successResponse(res, data);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// PUT /users/:id
export const updateUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, username, role, password, is_active } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (username !== undefined) updateData.username = username;
    if (role !== undefined) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (password) updateData.password_hash = bcrypt.hashSync(password, 10);

    try {
        // Check user exists and not soft-deleted
        const existing = await prisma.users.findFirst({ where: { id: Number(id), deleted_at: null } });
        if (!existing) return errorResponse(res, 'NOT_FOUND', 'User tidak ditemukan', 404);

        const data = await prisma.users.update({
            where: { id: Number(id) },
            data: updateData,
            select: { id: true, name: true, username: true, role: true, is_active: true }
        });
        return successResponse(res, data, 'User berhasil diupdate');
    } catch (e: any) {
        if (e.code === 'P2002') {
            return errorResponse(res, 'CONFLICT', 'Username sudah digunakan', 409);
        }
        return errorResponse(res, 'NOT_FOUND', 'User tidak ditemukan', 404);
    }
};

// DELETE /users/:id (soft delete)
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const existing = await prisma.users.findFirst({ where: { id: Number(req.params.id), deleted_at: null } });
        if (!existing) return errorResponse(res, 'NOT_FOUND', 'User tidak ditemukan', 404);

        await prisma.users.update({
            where: { id: Number(req.params.id) },
            data: { deleted_at: new Date() }
        });
        return successResponse(res, null, 'User berhasil dinonaktifkan');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};
