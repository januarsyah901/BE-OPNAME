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
exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.listCategories = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const response_1 = require("../utils/response");
const listCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield prisma_1.default.categories.findMany({ orderBy: { name: 'asc' } });
        return (0, response_1.successResponse)(res, data);
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.listCategories = listCategories;
const createCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, description } = req.body;
    if (!name)
        return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'name wajib diisi', 422);
    try {
        const data = yield prisma_1.default.categories.create({ data: { name, description } });
        return (0, response_1.successResponse)(res, data, 'Kategori berhasil dibuat', 201);
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.createCategory = createCategory;
const updateCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, description } = req.body;
    try {
        const data = yield prisma_1.default.categories.update({
            where: { id: Number(id) },
            data: { name, description }
        });
        return (0, response_1.successResponse)(res, data, 'Kategori berhasil diupdate');
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Kategori tidak ditemukan', 404);
    }
});
exports.updateCategory = updateCategory;
const deleteCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.default.categories.delete({ where: { id: Number(req.params.id) } });
        return (0, response_1.successResponse)(res, null, 'Kategori berhasil dihapus');
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Kategori tidak ditemukan', 404);
    }
});
exports.deleteCategory = deleteCategory;
