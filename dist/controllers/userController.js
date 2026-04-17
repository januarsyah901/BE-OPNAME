"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.getUser = exports.createUser = exports.listUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../config/prisma"));
const response_1 = require("../utils/response");
// GET /users
const listUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield prisma_1.default.users.findMany({
            where: { deleted_at: null },
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                phone: true,
                is_active: true,
                created_at: true,
            },
            orderBy: { id: "asc" },
        });
        return (0, response_1.successResponse)(res, data);
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, "SERVER_ERROR", e.message, 500);
    }
});
exports.listUsers = listUsers;
// POST /users
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, username, password, role, phone } = req.body;
    if (!name || !username || !password || !role) {
        return (0, response_1.errorResponse)(res, "VALIDATION_ERROR", "name, username, password, role wajib diisi", 422);
    }
    try {
        const password_hash = bcryptjs_1.default.hashSync(password, 10);
        const data = yield prisma_1.default.users.create({
            data: { name, username, password_hash, role, phone: phone !== null && phone !== void 0 ? phone : null },
            select: { id: true, name: true, username: true, role: true, phone: true },
        });
        return (0, response_1.successResponse)(res, data, "User berhasil dibuat", 201);
    }
    catch (e) {
        if (e.code === "P2002") {
            return (0, response_1.errorResponse)(res, "CONFLICT", "Username sudah digunakan", 409);
        }
        return (0, response_1.errorResponse)(res, "SERVER_ERROR", e.message, 500);
    }
});
exports.createUser = createUser;
// GET /users/:id
const getUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield prisma_1.default.users.findFirst({
            where: { id: Number(req.params.id), deleted_at: null },
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                phone: true,
                is_active: true,
                created_at: true,
            },
        });
        if (!data)
            return (0, response_1.errorResponse)(res, "NOT_FOUND", "User tidak ditemukan", 404);
        return (0, response_1.successResponse)(res, data);
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, "SERVER_ERROR", e.message, 500);
    }
});
exports.getUser = getUser;
// PUT /users/:id
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, username, role, password, is_active, phone } = req.body;
    const updateData = {};
    if (name !== undefined)
        updateData.name = name;
    if (username !== undefined)
        updateData.username = username;
    if (role !== undefined)
        updateData.role = role;
    if (is_active !== undefined)
        updateData.is_active = is_active;
    if (phone !== undefined)
        updateData.phone = phone;
    if (password)
        updateData.password_hash = bcryptjs_1.default.hashSync(password, 10);
    try {
        // Check user exists and not soft-deleted
        const existing = yield prisma_1.default.users.findFirst({
            where: { id: Number(id), deleted_at: null },
        });
        if (!existing)
            return (0, response_1.errorResponse)(res, "NOT_FOUND", "User tidak ditemukan", 404);
        const data = yield prisma_1.default.users.update({
            where: { id: Number(id) },
            data: updateData,
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                phone: true,
                is_active: true,
            },
        });
        return (0, response_1.successResponse)(res, data, "User berhasil diupdate");
    }
    catch (e) {
        if (e.code === "P2002") {
            return (0, response_1.errorResponse)(res, "CONFLICT", "Username sudah digunakan", 409);
        }
        return (0, response_1.errorResponse)(res, "NOT_FOUND", "User tidak ditemukan", 404);
    }
});
exports.updateUser = updateUser;
// DELETE /users/:id (soft delete)
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const existing = yield prisma_1.default.users.findFirst({
            where: { id: Number(req.params.id), deleted_at: null },
        });
        if (!existing)
            return (0, response_1.errorResponse)(res, "NOT_FOUND", "User tidak ditemukan", 404);
        yield prisma_1.default.users.update({
            where: { id: Number(req.params.id) },
            data: { deleted_at: new Date() },
        });
        return (0, response_1.successResponse)(res, null, "User berhasil dinonaktifkan");
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, "SERVER_ERROR", e.message, 500);
    }
});
exports.deleteUser = deleteUser;
