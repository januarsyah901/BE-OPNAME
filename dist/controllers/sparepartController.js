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
exports.printBarcode = exports.getBarcode = exports.deleteSparePart = exports.updateSparePart = exports.getSparePart = exports.createSparePart = exports.listSpareParts = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const response_1 = require("../utils/response");
const helpers_1 = require("../utils/helpers");
// GET /spare-parts
const listSpareParts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const { from, perPage } = (0, helpers_1.getPagination)(page);
    const { category_id, low_stock, search } = req.query;
    try {
        const where = { deleted_at: null };
        if (category_id)
            where.category_id = Number(category_id);
        if (search)
            where.name = { contains: search, mode: 'insensitive' };
        const [allData, total] = yield Promise.all([
            prisma_1.default.spare_parts.findMany({
                where,
                include: { categories: { select: { name: true } } },
                orderBy: { id: 'asc' },
                skip: from,
                take: perPage
            }),
            prisma_1.default.spare_parts.count({ where })
        ]);
        let result = allData;
        if (low_stock === 'true') {
            result = allData.filter((item) => item.current_stock < item.minimum_stock);
        }
        return (0, response_1.successResponse)(res, result, 'OK', 200, { page, total, per_page: perPage });
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.listSpareParts = listSpareParts;
// POST /spare-parts
const createSparePart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { category_id, name, cost_price, sell_price, current_stock, minimum_stock, unit } = req.body;
    if (!name || cost_price === undefined || sell_price === undefined) {
        return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'name, cost_price, sell_price wajib diisi', 422);
    }
    try {
        // Insert first to get ID, then update SKU
        const inserted = yield prisma_1.default.spare_parts.create({
            data: {
                category_id: category_id ? Number(category_id) : null,
                name,
                cost_price: Number(cost_price),
                sell_price: Number(sell_price),
                current_stock: current_stock !== undefined ? Number(current_stock) : 0,
                minimum_stock: minimum_stock !== undefined ? Number(minimum_stock) : 0,
                unit: unit || 'pcs',
                sku: 'TEMP',
                barcode_value: 'TEMP'
            }
        });
        // Get category name for SKU prefix
        let categoryName = 'GEN';
        if (category_id) {
            const cat = yield prisma_1.default.categories.findUnique({ where: { id: Number(category_id) } });
            if (cat)
                categoryName = cat.name;
        }
        const sku = (0, helpers_1.generateSKU)(categoryName, inserted.id);
        const data = yield prisma_1.default.spare_parts.update({
            where: { id: inserted.id },
            data: { sku, barcode_value: sku }
        });
        return (0, response_1.successResponse)(res, data, 'Spare part berhasil ditambahkan', 201);
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.createSparePart = createSparePart;
// GET /spare-parts/:id
const getSparePart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield prisma_1.default.spare_parts.findFirst({
            where: { id: Number(req.params.id), deleted_at: null },
            include: { categories: { select: { name: true } }, stock_movements: true }
        });
        if (!data)
            return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);
        return (0, response_1.successResponse)(res, data);
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.getSparePart = getSparePart;
// PUT /spare-parts/:id
const updateSparePart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { category_id, name, cost_price, sell_price, minimum_stock, unit } = req.body;
    try {
        const existing = yield prisma_1.default.spare_parts.findFirst({ where: { id: Number(id), deleted_at: null } });
        if (!existing)
            return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);
        const data = yield prisma_1.default.spare_parts.update({
            where: { id: Number(id) },
            data: {
                category_id: category_id !== undefined ? Number(category_id) : undefined,
                name,
                cost_price: cost_price !== undefined ? Number(cost_price) : undefined,
                sell_price: sell_price !== undefined ? Number(sell_price) : undefined,
                minimum_stock: minimum_stock !== undefined ? Number(minimum_stock) : undefined,
                unit,
                updated_at: new Date()
            }
        });
        return (0, response_1.successResponse)(res, data, 'Spare part berhasil diupdate');
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);
    }
});
exports.updateSparePart = updateSparePart;
// DELETE /spare-parts/:id (soft delete)
const deleteSparePart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const existing = yield prisma_1.default.spare_parts.findFirst({ where: { id: Number(req.params.id), deleted_at: null } });
        if (!existing)
            return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);
        yield prisma_1.default.spare_parts.update({
            where: { id: Number(req.params.id) },
            data: { deleted_at: new Date() }
        });
        return (0, response_1.successResponse)(res, null, 'Spare part berhasil dihapus');
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.deleteSparePart = deleteSparePart;
// GET /spare-parts/:id/barcode
const getBarcode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield prisma_1.default.spare_parts.findUnique({
            where: { id: Number(req.params.id) },
            select: { id: true, sku: true, barcode_value: true, barcode_image_url: true }
        });
        if (!data)
            return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);
        return (0, response_1.successResponse)(res, data);
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.getBarcode = getBarcode;
// POST /spare-parts/:id/barcode/print
const printBarcode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield prisma_1.default.spare_parts.findUnique({
            where: { id: Number(req.params.id) },
            select: { id: true, sku: true, barcode_value: true, name: true }
        });
        if (!data)
            return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);
        return (0, response_1.successResponse)(res, { message: 'PDF generation not yet implemented', barcode_value: data.barcode_value });
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.printBarcode = printBarcode;
