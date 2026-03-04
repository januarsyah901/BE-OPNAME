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
exports.stockOut = exports.stockIn = exports.listMovements = void 0;
const supabase_1 = require("../config/supabase");
const response_1 = require("../utils/response");
// Helper: update stok spare part
const adjustStock = (spare_part_id, delta) => __awaiter(void 0, void 0, void 0, function* () {
    const { data: part } = yield supabase_1.supabase.from('spare_parts').select('current_stock').eq('id', spare_part_id).single();
    if (!part)
        return false;
    const newStock = part.current_stock + delta;
    if (newStock < 0)
        return false;
    yield supabase_1.supabase.from('spare_parts').update({ current_stock: newStock }).eq('id', spare_part_id);
    return true;
});
// GET /stock-movements
const listMovements = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { spare_part_id, type } = req.query;
    let query = supabase_1.supabase
        .from('stock_movements')
        .select('*, spare_parts(name, sku)')
        .order('created_at', { ascending: false });
    if (spare_part_id)
        query = query.eq('spare_part_id', spare_part_id);
    if (type)
        query = query.eq('type', type);
    const { data, error } = yield query;
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    return (0, response_1.successResponse)(res, data);
});
exports.listMovements = listMovements;
// POST /stock/in
const stockIn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { spare_part_id, quantity, note } = req.body;
    if (!spare_part_id || !quantity) {
        return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'spare_part_id dan quantity wajib diisi', 422);
    }
    const ok = yield adjustStock(spare_part_id, quantity);
    if (!ok)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);
    const { data, error } = yield supabase_1.supabase
        .from('stock_movements')
        .insert([{ spare_part_id, type: 'in', quantity, note }])
        .select()
        .single();
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    const { data: updatedPart } = yield supabase_1.supabase.from('spare_parts').select('id, name, current_stock').eq('id', spare_part_id).single();
    return (0, response_1.successResponse)(res, { movement: data, spare_part: updatedPart }, 'Stok masuk berhasil dicatat');
});
exports.stockIn = stockIn;
// POST /stock/out
const stockOut = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { spare_part_id, quantity, note } = req.body;
    if (!spare_part_id || !quantity) {
        return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'spare_part_id dan quantity wajib diisi', 422);
    }
    const { data: part } = yield supabase_1.supabase.from('spare_parts').select('current_stock').eq('id', spare_part_id).single();
    if (!part)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);
    if (part.current_stock < quantity) {
        return (0, response_1.errorResponse)(res, 'STOCK_INSUFFICIENT', `Stok tidak cukup. Stok tersedia: ${part.current_stock}`, 422);
    }
    yield adjustStock(spare_part_id, -quantity);
    const { data, error } = yield supabase_1.supabase
        .from('stock_movements')
        .insert([{ spare_part_id, type: 'out', quantity, note }])
        .select()
        .single();
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    const { data: updatedPart } = yield supabase_1.supabase.from('spare_parts').select('id, name, current_stock').eq('id', spare_part_id).single();
    return (0, response_1.successResponse)(res, { movement: data, spare_part: updatedPart }, 'Stok keluar berhasil dicatat');
});
exports.stockOut = stockOut;
