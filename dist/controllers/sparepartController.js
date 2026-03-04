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
exports.printBarcode = exports.getBarcode = exports.deleteSparePart = exports.updateSparePart = exports.getSparePart = exports.createSparePart = exports.listSpareParts = void 0;
const supabase_1 = require("../config/supabase");
const response_1 = require("../utils/response");
const helpers_1 = require("../utils/helpers");
// GET /spare-parts
const listSpareParts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const { from, to, perPage } = (0, helpers_1.getPagination)(page);
    const { category_id, low_stock, search } = req.query;
    let query = supabase_1.supabase
        .from('spare_parts')
        .select('*, categories(name)', { count: 'exact' })
        .is('deleted_at', null)
        .order('id')
        .range(from, to);
    if (category_id)
        query = query.eq('category_id', category_id);
    if (low_stock === 'true')
        query = query.lt('current_stock', supabase_1.supabase.rpc);
    if (search)
        query = query.ilike('name', `%${search}%`);
    const { data, error, count } = yield query;
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    // Filter low_stock manually if needed (stock < minimum_stock)
    let result = data || [];
    if (low_stock === 'true') {
        result = result.filter((item) => item.current_stock < item.minimum_stock);
    }
    return (0, response_1.successResponse)(res, result, 'OK', 200, { page, total: count || 0, per_page: perPage });
});
exports.listSpareParts = listSpareParts;
// POST /spare-parts
const createSparePart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { category_id, name, cost_price, sell_price, current_stock, minimum_stock, unit } = req.body;
    if (!name || cost_price === undefined || sell_price === undefined) {
        return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'name, cost_price, sell_price wajib diisi', 422);
    }
    // Insert first to get the ID, then update SKU
    const { data: inserted, error: insertErr } = yield supabase_1.supabase
        .from('spare_parts')
        .insert([{ category_id, name, cost_price, sell_price, current_stock: current_stock || 0, minimum_stock: minimum_stock || 0, unit: unit || 'pcs', sku: 'TEMP', barcode_value: 'TEMP' }])
        .select()
        .single();
    if (insertErr)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', insertErr.message, 500);
    // Get category name for SKU prefix
    let categoryName = 'GEN';
    if (category_id) {
        const { data: cat } = yield supabase_1.supabase.from('categories').select('name').eq('id', category_id).single();
        if (cat)
            categoryName = cat.name;
    }
    const sku = (0, helpers_1.generateSKU)(categoryName, inserted.id);
    const { data, error } = yield supabase_1.supabase
        .from('spare_parts')
        .update({ sku, barcode_value: sku })
        .eq('id', inserted.id)
        .select()
        .single();
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    return (0, response_1.successResponse)(res, data, 'Spare part berhasil ditambahkan', 201);
});
exports.createSparePart = createSparePart;
// GET /spare-parts/:id
const getSparePart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { data, error } = yield supabase_1.supabase
        .from('spare_parts')
        .select('*, categories(name), stock_movements(*)')
        .eq('id', id)
        .is('deleted_at', null)
        .single();
    if (error || !data)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);
    return (0, response_1.successResponse)(res, data);
});
exports.getSparePart = getSparePart;
// PUT /spare-parts/:id
const updateSparePart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { category_id, name, cost_price, sell_price, minimum_stock, unit } = req.body;
    const { data, error } = yield supabase_1.supabase
        .from('spare_parts')
        .update({ category_id, name, cost_price, sell_price, minimum_stock, unit, updated_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();
    if (error || !data)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);
    return (0, response_1.successResponse)(res, data, 'Spare part berhasil diupdate');
});
exports.updateSparePart = updateSparePart;
// DELETE /spare-parts/:id (soft delete)
const deleteSparePart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { error } = yield supabase_1.supabase
        .from('spare_parts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .is('deleted_at', null);
    if (error)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);
    return (0, response_1.successResponse)(res, null, 'Spare part berhasil dihapus');
});
exports.deleteSparePart = deleteSparePart;
// GET /spare-parts/:id/barcode
const getBarcode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { data, error } = yield supabase_1.supabase
        .from('spare_parts')
        .select('id, sku, barcode_value, barcode_image_url')
        .eq('id', id)
        .single();
    if (error || !data)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);
    return (0, response_1.successResponse)(res, data);
});
exports.getBarcode = getBarcode;
// POST /spare-parts/:id/barcode/print
const printBarcode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { data, error } = yield supabase_1.supabase
        .from('spare_parts')
        .select('id, sku, barcode_value, name')
        .eq('id', id)
        .single();
    if (error || !data)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Spare part tidak ditemukan', 404);
    // TODO: Integrate PDF generation (e.g., puppeteer or pdfkit)
    return (0, response_1.successResponse)(res, { message: 'PDF generation not yet implemented', barcode_value: data.barcode_value });
});
exports.printBarcode = printBarcode;
