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
exports.deleteTransaction = exports.getTransactionPdf = exports.updatePayment = exports.getTransaction = exports.createTransaction = exports.listTransactions = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const response_1 = require("../utils/response");
const helpers_1 = require("../utils/helpers");
// GET /transactions
const listTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const { from, perPage } = (0, helpers_1.getPagination)(page);
    const { date, status, plate_number } = req.query;
    try {
        const where = {};
        if (date)
            where.transaction_date = new Date(date);
        if (status)
            where.payment_status = String(status);
        if (plate_number) {
            where.vehicles = {
                plate_number: String(plate_number)
            };
        }
        const [data, total] = yield Promise.all([
            prisma_1.default.transactions.findMany({
                where,
                include: {
                    customers: { select: { name: true, phone: true } },
                    vehicles: { select: { plate_number: true, type: true, brand: true, model: true } },
                    transaction_items: {
                        include: {
                            service_bundles: {
                                include: { items: true }
                            }
                        }
                    }
                },
                orderBy: { transaction_date: 'desc' },
                skip: from,
                take: perPage
            }),
            prisma_1.default.transactions.count({ where })
        ]);
        return (0, response_1.successResponse)(res, data, 'OK', 200, { page, total, per_page: perPage });
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.listTransactions = listTransactions;
// POST /transactions
const createTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { customer_id, vehicle_id, transaction_date, payment_method, notes, items } = req.body;
    if (!customer_id || !vehicle_id || !transaction_date || !items || items.length === 0) {
        return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'customer_id, vehicle_id, transaction_date, items wajib diisi', 422);
    }
    const userId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null;
    try {
        // Cek stok semua spare part yang digunakan
        for (const item of items) {
            if (item.item_type === 'spare_part' && item.spare_part_id) {
                const part = yield prisma_1.default.spare_parts.findUnique({
                    where: { id: Number(item.spare_part_id) },
                    select: { current_stock: true, name: true }
                });
                if (!part)
                    return (0, response_1.errorResponse)(res, 'NOT_FOUND', `Spare part ID ${item.spare_part_id} tidak ditemukan`, 404);
                if (part.current_stock < item.quantity) {
                    return (0, response_1.errorResponse)(res, 'STOCK_INSUFFICIENT', `Stok "${part.name}" tidak cukup. Tersedia: ${part.current_stock}`, 422);
                }
            }
        }
        // Hitung subtotal & total
        const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);
        // Ambil setting pajak
        const profile = yield prisma_1.default.bengkel_profile.findFirst({ where: { id: 1 } });
        const tax_percentage = Number((profile === null || profile === void 0 ? void 0 : profile.tax_percentage) || 0);
        const tax_amount = (subtotal * tax_percentage) / 100;
        const total_amount = subtotal + tax_amount;
        // Generate invoice number
        const today = new Date();
        const seqCount = yield prisma_1.default.transactions.count({
            where: { created_at: { gte: new Date(today.toISOString().split('T')[0]) } }
        });
        const invoice_number = (0, helpers_1.generateInvoiceNumber)(today, seqCount + 1);
        // Insert transaction
        const transaction = yield prisma_1.default.transactions.create({
            data: {
                customer_id: Number(customer_id),
                vehicle_id: Number(vehicle_id),
                user_id: userId,
                transaction_date: new Date(transaction_date),
                subtotal_amount: subtotal,
                total_amount,
                tax_percentage,
                tax_amount,
                paid_amount: Number(req.body.paid_amount || 0),
                payment_method: payment_method || 'cash',
                payment_status: req.body.payment_status || 'belum_bayar',
                notes,
                invoice_number,
                transaction_items: {
                    create: items.map((item) => ({
                        item_type: item.item_type,
                        spare_part_id: item.spare_part_id ? Number(item.spare_part_id) : null,
                        bundle_id: item.bundle_id ? Number(item.bundle_id) : null,
                        item_name: item.item_name,
                        quantity: Number(item.quantity),
                        unit_price: Number(item.unit_price),
                        subtotal: Number(item.quantity) * Number(item.unit_price)
                    }))
                }
            },
            include: {
                customers: true,
                vehicles: true,
                transaction_items: true
            }
        });
        // Kurangi stok & catat movement
        for (const item of items) {
            if (item.item_type === 'spare_part' && item.spare_part_id) {
                const part = yield prisma_1.default.spare_parts.findUnique({
                    where: { id: Number(item.spare_part_id) },
                    select: { current_stock: true }
                });
                if (part) {
                    const newStock = part.current_stock - Number(item.quantity);
                    yield prisma_1.default.spare_parts.update({
                        where: { id: Number(item.spare_part_id) },
                        data: { current_stock: newStock }
                    });
                    yield prisma_1.default.stock_movements.create({
                        data: {
                            spare_part_id: Number(item.spare_part_id),
                            user_id: userId,
                            type: 'keluar',
                            quantity_change: Number(item.quantity),
                            stock_before: part.current_stock,
                            stock_after: newStock,
                            note: `Transaksi ${invoice_number}`,
                            reference_id: transaction.id,
                            reference_type: 'transaction'
                        }
                    });
                }
            }
        }
        return (0, response_1.successResponse)(res, transaction, 'Transaksi berhasil dibuat', 201);
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.createTransaction = createTransaction;
// GET /transactions/:id
const getTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield prisma_1.default.transactions.findUnique({
            where: { id: Number(req.params.id) },
            include: {
                customers: { select: { name: true, phone: true } },
                vehicles: { select: { plate_number: true, type: true, brand: true, model: true } },
                transaction_items: {
                    include: {
                        service_bundles: {
                            include: { items: true }
                        }
                    }
                }
            }
        });
        if (!data)
            return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Transaksi tidak ditemukan', 404);
        return (0, response_1.successResponse)(res, data);
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.getTransaction = getTransaction;
// PATCH /transactions/:id/payment
const updatePayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { paid_amount, payment_status } = req.body;
    if (paid_amount === undefined || !payment_status) {
        return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'paid_amount dan payment_status wajib diisi', 422);
    }
    try {
        const data = yield prisma_1.default.transactions.update({
            where: { id: Number(id) },
            data: { paid_amount: Number(paid_amount), payment_status }
        });
        return (0, response_1.successResponse)(res, data, 'Status pembayaran berhasil diupdate');
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Transaksi tidak ditemukan', 404);
    }
});
exports.updatePayment = updatePayment;
// GET /transactions/:id/pdf
const getTransactionPdf = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield prisma_1.default.transactions.findUnique({
            where: { id: Number(req.params.id) },
            select: { invoice_number: true }
        });
        if (!data)
            return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Transaksi tidak ditemukan', 404);
        return (0, response_1.successResponse)(res, { message: 'PDF generation not yet implemented', invoice_number: data.invoice_number });
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.getTransactionPdf = getTransactionPdf;
// DELETE /transactions/:id
const deleteTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Check if exists
        const tx = yield prisma_1.default.transactions.findUnique({ where: { id: Number(id) } });
        if (!tx)
            return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Transaksi tidak ditemukan', 404);
        // Delete (Cascades will handle transaction_items)
        yield prisma_1.default.transactions.delete({ where: { id: Number(id) } });
        return (0, response_1.successResponse)(res, null, 'Transaksi berhasil dihapus');
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.deleteTransaction = deleteTransaction;
