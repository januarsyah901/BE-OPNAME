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
const supabase_1 = require("../config/supabase");
const response_1 = require("../utils/response");
// GET /users
const listUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase_1.supabase
        .from('users')
        .select('id, name, email, role, created_at')
        .is('deleted_at', null)
        .order('id');
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    return (0, response_1.successResponse)(res, data);
});
exports.listUsers = listUsers;
// POST /users
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
        return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'name, email, password, role wajib diisi', 422);
    }
    const password_hash = bcryptjs_1.default.hashSync(password, 10);
    const { data, error } = yield supabase_1.supabase
        .from('users')
        .insert([{ name, email, password_hash, role }])
        .select('id, name, email, role')
        .single();
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    return (0, response_1.successResponse)(res, data, 'User berhasil dibuat', 201);
});
exports.createUser = createUser;
// GET /users/:id
const getUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { data, error } = yield supabase_1.supabase
        .from('users')
        .select('id, name, email, role, created_at')
        .eq('id', id)
        .is('deleted_at', null)
        .single();
    if (error || !data)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'User tidak ditemukan', 404);
    return (0, response_1.successResponse)(res, data);
});
exports.getUser = getUser;
// PUT /users/:id
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, email, role, password } = req.body;
    const updates = { name, email, role, updated_at: new Date().toISOString() };
    if (password)
        updates.password_hash = bcryptjs_1.default.hashSync(password, 10);
    const { data, error } = yield supabase_1.supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .is('deleted_at', null)
        .select('id, name, email, role')
        .single();
    if (error || !data)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'User tidak ditemukan', 404);
    return (0, response_1.successResponse)(res, data, 'User berhasil diupdate');
});
exports.updateUser = updateUser;
// DELETE /users/:id (soft delete)
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { error } = yield supabase_1.supabase
        .from('users')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null);
    if (error)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'User tidak ditemukan', 404);
    return (0, response_1.successResponse)(res, null, 'User berhasil dinonaktifkan');
});
exports.deleteUser = deleteUser;
