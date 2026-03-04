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
exports.getTransactionPdf = exports.updatePayment = exports.getTransaction = exports.createTransaction = exports.listTransactions = void 0;
const supabase_1 = require("../config/supabase");
const response_1 = require("../utils/response");
const helpers_1 = require("../utils/helpers");
// GET /transactions
const listTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const { from, to, perPage } = (0, helpers_1.getPagination)(page);
    const { date, status } = req.query;
    let query = supabase_1.supabase
        .from('transactions')
        .select('*, customers(name), vehicles(plate_number)', { count: 'exact' })
        .order('transaction_date', { ascending: false })
        .range(from, to);
    if (date)
        query = query.eq('transaction_date', date);
    if (status)
        query = query.eq('payment_status', status);
    const { data, error, count } = yield query;
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    return (0, response_1.successResponse)(res, data, 'OK', 200, { page, total: count || 0, per_page: perPage });
});
exports.listTransactions = listTransactions;
// POST /transactions
const createTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { customer_id, vehicle_id, transaction_date, payment_method, notes, items } = req.body;
    if (!customer_id || !vehicle_id || !transaction_date || !items || items.length === 0) {
        return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'customer_id, vehicle_id, transaction_date, items wajib diisi', 422);
    }
    // Cek stok semua spare part yang digunakan
    for (const item of items) {
        if (item.item_type === 'spare_part' && item.spare_part_id) {
            const { data: part } = yield supabase_1.supabase.from('spare_parts').select('current_stock, name').eq('id', item.spare_part_id).single();
            if (!part)
                return (0, response_1.errorResponse)(res, 'NOT_FOUND', `Spare part ID ${item.spare_part_id} tidak ditemukan`, 404);
            if (part.current_stock < item.quantity) {
                return (0, response_1.errorResponse)(res, 'STOCK_INSUFFICIENT', `Stok "${part.name}" tidak cukup. Tersedia: ${part.current_stock}`, 422);
            }
        }
    }
    // Hitung total
    const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    // Generate invoice number
    const today = new Date();
    const { count: seqCount } = yield supabase_1.supabase.from('transactions').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString().split('T')[0]);
    const invoice_number = (0, helpers_1.generateInvoiceNumber)(today, (seqCount || 0) + 1);
    // Insert transaction
    const { data: transaction, error: tErr } = yield supabase_1.supabase
        .from('transactions')
        .insert([{ customer_id, vehicle_id, transaction_date, total_amount, paid_amount: 0, payment_method: payment_method || 'cash', payment_status: 'pending', notes, invoice_number }])
        .select()
        .single();
    if (tErr)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', tErr.message, 500);
    // Insert transaction items & kurangi stok
    const itemsToInsert = items.map((item) => ({
        transaction_id: transaction.id,
        item_type: item.item_type,
        spare_part_id: item.spare_part_id || null,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price
    }));
    yield supabase_1.supabase.from('transaction_items').insert(itemsToInsert);
    // Kurangi stok & catat movement
    for (const item of items) {
        if (item.item_type === 'spare_part' && item.spare_part_id) {
            const { data: part } = yield supabase_1.supabase.from('spare_parts').select('current_stock').eq('id', item.spare_part_id).single();
            if (part) {
                yield supabase_1.supabase.from('spare_parts').update({ current_stock: part.current_stock - item.quantity }).eq('id', item.spare_part_id);
                yield supabase_1.supabase.from('stock_movements').insert([{ spare_part_id: item.spare_part_id, type: 'transaction_out', quantity: item.quantity, note: `Transaksi ${invoice_number}` }]);
            }
        }
    }
    return (0, response_1.successResponse)(res, Object.assign(Object.assign({}, transaction), { items: itemsToInsert }), 'Transaksi berhasil dibuat', 201);
});
exports.createTransaction = createTransaction;
// GET /transactions/:id
const getTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { data, error } = yield supabase_1.supabase
        .from('transactions')
        .select('*, customers(name, phone), vehicles(plate_number, type, brand, model), transaction_items(*)')
        .eq('id', id)
        .single();
    if (error || !data)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Transaksi tidak ditemukan', 404);
    return (0, response_1.successResponse)(res, data);
});
exports.getTransaction = getTransaction;
// PATCH /transactions/:id/payment
const updatePayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { paid_amount, payment_status } = req.body;
    if (paid_amount === undefined || !payment_status) {
        return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'paid_amount dan payment_status wajib diisi', 422);
    }
    const { data, error } = yield supabase_1.supabase
        .from('transactions')
        .update({ paid_amount, payment_status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error || !data)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Transaksi tidak ditemukan', 404);
    return (0, response_1.successResponse)(res, data, 'Status pembayaran berhasil diupdate');
});
exports.updatePayment = updatePayment;
// GET /transactions/:id/pdf
const getTransactionPdf = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { data, error } = yield supabase_1.supabase
        .from('transactions')
        .select('invoice_number')
        .eq('id', id)
        .single();
    if (error || !data)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Transaksi tidak ditemukan', 404);
    // TODO: implement PDF generation
    return (0, response_1.successResponse)(res, { message: 'PDF generation not yet implemented', invoice_number: data.invoice_number });
});
exports.getTransactionPdf = getTransactionPdf;
