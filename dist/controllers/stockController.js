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
exports.stockOut = exports.stockIn = exports.listMovements = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const response_1 = require("../utils/response");
const helpers_1 = require("../utils/helpers");
const waNotificationService_1 = require("../services/waNotificationService");
// GET /stock-movements
const listMovements = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const { from, perPage } = (0, helpers_1.getPagination)(page);
    const { spare_part_id, type } = req.query;
    try {
        const where = {};
        if (spare_part_id)
            where.spare_part_id = Number(spare_part_id);
        if (type)
            where.type = String(type);
        const [data, total] = yield Promise.all([
            prisma_1.default.stock_movements.findMany({
                where,
                include: { spare_parts: { select: { name: true, sku: true } } },
                orderBy: { created_at: "desc" },
                skip: from,
                take: perPage,
            }),
            prisma_1.default.stock_movements.count({ where }),
        ]);
        return (0, response_1.successResponse)(res, data, "OK", 200, {
            page,
            total,
            per_page: perPage,
        });
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, "SERVER_ERROR", e.message, 500);
    }
});
exports.listMovements = listMovements;
// POST /stock/in
const stockIn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { spare_part_id, quantity, note } = req.body;
    if (!spare_part_id || !quantity) {
        return (0, response_1.errorResponse)(res, "VALIDATION_ERROR", "spare_part_id dan quantity wajib diisi", 422);
    }
    const userId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null;
    try {
        const part = yield prisma_1.default.spare_parts.findUnique({
            where: { id: Number(spare_part_id) },
            select: { current_stock: true, name: true, minimum_stock: true },
        });
        if (!part)
            return (0, response_1.errorResponse)(res, "NOT_FOUND", "Spare part tidak ditemukan", 404);
        const stockBefore = part.current_stock;
        const stockAfter = stockBefore + Number(quantity);
        // Update stok
        yield prisma_1.default.spare_parts.update({
            where: { id: Number(spare_part_id) },
            data: { current_stock: stockAfter },
        });
        // Catat movement dengan stock_before & stock_after
        const movement = yield prisma_1.default.stock_movements.create({
            data: {
                spare_part_id: Number(spare_part_id),
                user_id: userId,
                type: "masuk",
                quantity_change: Number(quantity),
                stock_before: stockBefore,
                stock_after: stockAfter,
                note,
                reference_type: "manual",
            },
        });
        // Trigger WA notif jika stok masih di bawah minimum
        yield (0, waNotificationService_1.triggerWaNotificationIfNeeded)(Number(spare_part_id), stockAfter);
        return (0, response_1.successResponse)(res, {
            movement,
            spare_part: {
                id: Number(spare_part_id),
                name: part.name,
                current_stock: stockAfter,
            },
        }, "Stok masuk berhasil dicatat");
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, "SERVER_ERROR", e.message, 500);
    }
});
exports.stockIn = stockIn;
// POST /stock/out
const stockOut = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { spare_part_id, quantity, note } = req.body;
    if (!spare_part_id || !quantity) {
        return (0, response_1.errorResponse)(res, "VALIDATION_ERROR", "spare_part_id dan quantity wajib diisi", 422);
    }
    const userId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null;
    try {
        const part = yield prisma_1.default.spare_parts.findUnique({
            where: { id: Number(spare_part_id) },
            select: { current_stock: true, name: true, minimum_stock: true },
        });
        if (!part)
            return (0, response_1.errorResponse)(res, "NOT_FOUND", "Spare part tidak ditemukan", 404);
        if (part.current_stock < Number(quantity)) {
            return (0, response_1.errorResponse)(res, "STOCK_INSUFFICIENT", `Stok tidak cukup. Stok tersedia: ${part.current_stock}`, 422);
        }
        const stockBefore = part.current_stock;
        const stockAfter = stockBefore - Number(quantity);
        // Update stok
        yield prisma_1.default.spare_parts.update({
            where: { id: Number(spare_part_id) },
            data: { current_stock: stockAfter },
        });
        // Catat movement dengan stock_before & stock_after
        const movement = yield prisma_1.default.stock_movements.create({
            data: {
                spare_part_id: Number(spare_part_id),
                user_id: userId,
                type: "keluar",
                quantity_change: Number(quantity),
                stock_before: stockBefore,
                stock_after: stockAfter,
                note,
                reference_type: "manual",
            },
        });
        // Trigger WA notif jika stok di bawah minimum
        yield (0, waNotificationService_1.triggerWaNotificationIfNeeded)(Number(spare_part_id), stockAfter);
        return (0, response_1.successResponse)(res, {
            movement,
            spare_part: {
                id: Number(spare_part_id),
                name: part.name,
                current_stock: stockAfter,
            },
        }, "Stok keluar berhasil dicatat");
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, "SERVER_ERROR", e.message, 500);
    }
});
exports.stockOut = stockOut;
