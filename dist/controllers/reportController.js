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
exports.opnameReport = exports.lowStockReport = exports.topProductsReport = exports.revenueReport = void 0;
const supabase_1 = require("../config/supabase");
const response_1 = require("../utils/response");
// GET /reports/revenue?period=monthly&date=2026-03
const revenueReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { period, date } = req.query;
    if (!period || !date) {
        return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'period dan date wajib diisi', 422);
    }
    let startDate, endDate;
    if (period === 'monthly') {
        startDate = `${date}-01`;
        const [y, m] = date.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        endDate = `${date}-${lastDay}`;
    }
    else {
        startDate = date;
        endDate = date;
    }
    const { data: transactions, error } = yield supabase_1.supabase
        .from('transactions')
        .select('transaction_date, total_amount, payment_status, transaction_items(quantity, unit_price, spare_parts(cost_price))')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .eq('payment_status', 'lunas');
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    const total_revenue = (transactions || []).reduce((sum, t) => sum + t.total_amount, 0);
    const total_transactions = (transactions || []).length;
    // Gross profit calculation
    const gross_profit = (transactions || []).reduce((sum, t) => {
        const cost = (t.transaction_items || []).reduce((c, item) => {
            var _a;
            const costPrice = ((_a = item.spare_parts) === null || _a === void 0 ? void 0 : _a.cost_price) || 0;
            return c + (item.quantity * costPrice);
        }, 0);
        return sum + (t.total_amount - cost);
    }, 0);
    // Daily breakdown
    const dailyMap = {};
    (transactions || []).forEach((t) => {
        const d = t.transaction_date;
        dailyMap[d] = (dailyMap[d] || 0) + t.total_amount;
    });
    const daily_breakdown = Object.entries(dailyMap)
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date));
    return (0, response_1.successResponse)(res, { period: date, total_revenue, total_transactions, gross_profit, daily_breakdown });
});
exports.revenueReport = revenueReport;
// GET /reports/top-products
const topProductsReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const limit = parseInt(req.query.limit) || 10;
    const { data, error } = yield supabase_1.supabase
        .from('transaction_items')
        .select('item_name, spare_part_id, quantity')
        .eq('item_type', 'spare_part');
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    // Aggregate quantity sold
    const aggregated = {};
    (data || []).forEach((item) => {
        const key = item.spare_part_id || item.item_name;
        if (!aggregated[key])
            aggregated[key] = { name: item.item_name, total_qty: 0 };
        aggregated[key].total_qty += item.quantity;
    });
    const result = Object.values(aggregated)
        .sort((a, b) => b.total_qty - a.total_qty)
        .slice(0, limit);
    return (0, response_1.successResponse)(res, result);
});
exports.topProductsReport = topProductsReport;
// GET /reports/low-stock
const lowStockReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase_1.supabase
        .from('spare_parts')
        .select('id, name, sku, current_stock, minimum_stock, unit, categories(name)')
        .is('deleted_at', null)
        .order('current_stock');
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    const lowStock = (data || []).filter((item) => item.current_stock < item.minimum_stock);
    return (0, response_1.successResponse)(res, lowStock);
});
exports.lowStockReport = lowStockReport;
// GET /reports/opname/:id
const opnameReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { data, error } = yield supabase_1.supabase
        .from('opnames')
        .select('*, opname_items(*, spare_parts(name, sku))')
        .eq('id', id)
        .single();
    if (error || !data)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Opname tidak ditemukan', 404);
    const items = data.opname_items || [];
    const summary = {
        total_items: items.length,
        items_with_difference: items.filter((i) => i.difference !== 0).length,
        items_ok: items.filter((i) => i.difference === 0).length
    };
    return (0, response_1.successResponse)(res, Object.assign(Object.assign({}, data), { summary }));
});
exports.opnameReport = opnameReport;
