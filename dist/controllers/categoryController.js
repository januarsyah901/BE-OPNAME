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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.listCategories = void 0;
const supabase_1 = require("../config/supabase");
const response_1 = require("../utils/response");
const listCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase_1.supabase.from('categories').select('*').order('name');
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    return (0, response_1.successResponse)(res, data);
});
exports.listCategories = listCategories;
const createCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, description } = req.body;
    if (!name)
        return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'name wajib diisi', 422);
    const { data, error } = yield supabase_1.supabase.from('categories').insert([{ name, description }]).select().single();
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    return (0, response_1.successResponse)(res, data, 'Kategori berhasil dibuat', 201);
});
exports.createCategory = createCategory;
const updateCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, description } = req.body;
    const { data, error } = yield supabase_1.supabase
        .from('categories')
        .update({ name, description, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error || !data)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Kategori tidak ditemukan', 404);
    return (0, response_1.successResponse)(res, data, 'Kategori berhasil diupdate');
});
exports.updateCategory = updateCategory;
const deleteCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { error } = yield supabase_1.supabase.from('categories').delete().eq('id', req.params.id);
    if (error)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Kategori tidak ditemukan', 404);
    return (0, response_1.successResponse)(res, null, 'Kategori berhasil dihapus');
});
exports.deleteCategory = deleteCategory;
