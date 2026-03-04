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
exports.closeOpname = exports.updateOpnameItem = exports.addOpnameItem = exports.getOpname = exports.createOpname = exports.listOpnames = void 0;
const supabase_1 = require("../config/supabase");
const response_1 = require("../utils/response");
// GET /opnames
const listOpnames = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase_1.supabase.from('opnames').select('*').order('created_at', { ascending: false });
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    return (0, response_1.successResponse)(res, data);
});
exports.listOpnames = listOpnames;
// POST /opnames
const createOpname = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { session_name } = req.body;
    if (!session_name)
        return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'session_name wajib diisi', 422);
    // Cek apakah ada sesi yang masih open
    const { data: openSession } = yield supabase_1.supabase.from('opnames').select('id').eq('status', 'open').limit(1).single();
    if (openSession) {
        return (0, response_1.errorResponse)(res, 'OPNAME_ALREADY_OPEN', 'Masih ada sesi opname yang belum ditutup', 409);
    }
    const { data, error } = yield supabase_1.supabase.from('opnames').insert([{ session_name, status: 'open' }]).select().single();
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    return (0, response_1.successResponse)(res, data, 'Sesi opname berhasil dibuat', 201);
});
exports.createOpname = createOpname;
// GET /opnames/:id
const getOpname = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { data, error } = yield supabase_1.supabase
        .from('opnames')
        .select('*, opname_items(*, spare_parts(name, sku, current_stock))')
        .eq('id', id)
        .single();
    if (error || !data)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Sesi opname tidak ditemukan', 404);
    return (0, response_1.successResponse)(res, data);
});
exports.getOpname = getOpname;
// POST /opnames/:id/items
const addOpnameItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { spare_part_id, physical_count } = req.body;
    if (!spare_part_id || physical_count === undefined) {
        return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'spare_part_id dan physical_count wajib diisi', 422);
    }
    const { data: part } = yield supabase_1.supabase.from('spare_parts').select('current_stock').eq('id', spare_part_id).single();
    if (!part)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);
    // Upsert item opname
    const { data, error } = yield supabase_1.supabase
        .from('opname_items')
        .upsert([{ opname_id: id, spare_part_id, system_count: part.current_stock, physical_count }], { onConflict: 'opname_id,spare_part_id' })
        .select()
        .single();
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    return (0, response_1.successResponse)(res, data, 'Hitungan fisik berhasil disimpan');
});
exports.addOpnameItem = addOpnameItem;
// PUT /opnames/:id/items/:item_id
const updateOpnameItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { item_id } = req.params;
    const { physical_count } = req.body;
    if (physical_count === undefined)
        return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'physical_count wajib diisi', 422);
    const { data, error } = yield supabase_1.supabase
        .from('opname_items')
        .update({ physical_count, updated_at: new Date().toISOString() })
        .eq('id', item_id)
        .select()
        .single();
    if (error || !data)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Item opname tidak ditemukan', 404);
    return (0, response_1.successResponse)(res, data, 'Hitungan fisik diupdate');
});
exports.updateOpnameItem = updateOpnameItem;
// POST /opnames/:id/close
const closeOpname = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { data: opname } = yield supabase_1.supabase.from('opnames').select('status').eq('id', id).single();
    if (!opname)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Sesi opname tidak ditemukan', 404);
    if (opname.status === 'closed')
        return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'Sesi ini sudah ditutup', 400);
    // Ambil semua item dengan selisih
    const { data: items } = yield supabase_1.supabase
        .from('opname_items')
        .select('spare_part_id, system_count, physical_count')
        .eq('opname_id', id)
        .not('physical_count', 'is', null);
    if (items && items.length > 0) {
        const movements = items
            .filter((item) => item.physical_count !== item.system_count)
            .map((item) => ({
            spare_part_id: item.spare_part_id,
            type: 'opname_adjustment',
            quantity: Math.abs(item.physical_count - item.system_count),
            note: `Adjustment opname #${id}: sistem=${item.system_count}, fisik=${item.physical_count}`
        }));
        if (movements.length > 0) {
            yield supabase_1.supabase.from('stock_movements').insert(movements);
            // Update stok aktual sesuai hitungan fisik
            for (const item of items) {
                yield supabase_1.supabase.from('spare_parts').update({ current_stock: item.physical_count }).eq('id', item.spare_part_id);
            }
        }
    }
    // Tutup sesi
    const { data, error } = yield supabase_1.supabase
        .from('opnames')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    return (0, response_1.successResponse)(res, data, 'Sesi opname berhasil ditutup dan stok disesuaikan');
});
exports.closeOpname = closeOpname;
