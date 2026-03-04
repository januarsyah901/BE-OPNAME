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
exports.getCustomerHistory = exports.deleteCustomer = exports.updateCustomer = exports.getCustomer = exports.createCustomer = exports.listCustomers = void 0;
const supabase_1 = require("../config/supabase");
const response_1 = require("../utils/response");
const helpers_1 = require("../utils/helpers");
// GET /customers
const listCustomers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || '';
    const { from, to, perPage } = (0, helpers_1.getPagination)(page);
    let query = supabase_1.supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .order('id')
        .range(from, to);
    if (search)
        query = query.ilike('name', `%${search}%`);
    const { data, error, count } = yield query;
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    return (0, response_1.successResponse)(res, data, 'OK', 200, { page, total: count || 0, per_page: perPage });
});
exports.listCustomers = listCustomers;
// POST /customers
const createCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, phone, email, address } = req.body;
    if (!name)
        return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'name wajib diisi', 422);
    const { data, error } = yield supabase_1.supabase
        .from('customers')
        .insert([{ name, phone, email, address }])
        .select()
        .single();
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    return (0, response_1.successResponse)(res, data, 'Customer berhasil ditambahkan', 201);
});
exports.createCustomer = createCustomer;
// GET /customers/:id
const getCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { data: customer, error } = yield supabase_1.supabase
        .from('customers')
        .select('*, vehicles(*)')
        .eq('id', id)
        .is('deleted_at', null)
        .single();
    if (error || !customer)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Customer tidak ditemukan', 404);
    return (0, response_1.successResponse)(res, customer);
});
exports.getCustomer = getCustomer;
// PUT /customers/:id
const updateCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, phone, email, address } = req.body;
    const { data, error } = yield supabase_1.supabase
        .from('customers')
        .update({ name, phone, email, address, updated_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();
    if (error || !data)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Customer tidak ditemukan', 404);
    return (0, response_1.successResponse)(res, data, 'Customer berhasil diupdate');
});
exports.updateCustomer = updateCustomer;
// DELETE /customers/:id (soft delete)
const deleteCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { error } = yield supabase_1.supabase
        .from('customers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .is('deleted_at', null);
    if (error)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Customer tidak ditemukan', 404);
    return (0, response_1.successResponse)(res, null, 'Customer berhasil dihapus');
});
exports.deleteCustomer = deleteCustomer;
// GET /customers/:id/history
const getCustomerHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { data: customer, error: cErr } = yield supabase_1.supabase
        .from('customers').select('id, name').eq('id', id).single();
    if (cErr || !customer)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Customer tidak ditemukan', 404);
    const { data: transactions, error: tErr } = yield supabase_1.supabase
        .from('transactions')
        .select('invoice_number, total_amount, payment_status, transaction_date, vehicles(plate_number, type)')
        .eq('customer_id', id)
        .order('transaction_date', { ascending: false });
    if (tErr)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', tErr.message, 500);
    return (0, response_1.successResponse)(res, { customer, transactions });
});
exports.getCustomerHistory = getCustomerHistory;
