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
exports.recentActivitiesReport = exports.dashboardStatsReport = exports.vehicleRatioReport = exports.remindersReport = exports.opnameReport = exports.lowStockReport = exports.topServicesReport = exports.topProductsReport = exports.revenueReport = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const response_1 = require("../utils/response");
// GET /reports/revenue?period=monthly&date=2026-03
const revenueReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { period, date } = req.query;
    if (!period || !date) {
        return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'period dan date wajib diisi', 422);
    }
    try {
        let startDate, endDate;
        if (period === 'monthly') {
            const [y, m] = date.split('-').map(Number);
            startDate = new Date(y, m - 1, 1);
            const lastDay = new Date(y, m, 0).getDate();
            endDate = new Date(y, m - 1, lastDay, 23, 59, 59, 999);
        }
        else {
            startDate = new Date(date);
            endDate = new Date(date + 'T23:59:59.999Z');
        }
        const transactions = yield prisma_1.default.transactions.findMany({
            where: {
                transaction_date: { gte: startDate, lte: endDate },
                payment_status: 'lunas'
            },
            include: {
                transaction_items: {
                    include: { spare_parts: { select: { cost_price: true } } }
                }
            }
        });
        const total_revenue = transactions.reduce((sum, t) => sum + Number(t.total_amount), 0);
        const total_transactions = transactions.length;
        const gross_profit = transactions.reduce((sum, t) => {
            const cost = t.transaction_items.reduce((c, item) => {
                var _a, _b;
                const costPrice = Number((_b = (_a = item.spare_parts) === null || _a === void 0 ? void 0 : _a.cost_price) !== null && _b !== void 0 ? _b : 0);
                return c + (item.quantity * costPrice);
            }, 0);
            return sum + (Number(t.total_amount) - cost);
        }, 0);
        // Daily breakdown
        const dailyMap = {};
        transactions.forEach((t) => {
            // transaction_date is a Date object; extract YYYY-MM-DD
            const d = t.transaction_date instanceof Date
                ? t.transaction_date.toISOString().split('T')[0]
                : String(t.transaction_date).split('T')[0];
            dailyMap[d] = (dailyMap[d] || 0) + Number(t.total_amount);
        });
        const daily_breakdown = Object.entries(dailyMap)
            .map(([date, revenue]) => ({ date, revenue }))
            .sort((a, b) => a.date.localeCompare(b.date));
        return (0, response_1.successResponse)(res, { period: date, total_revenue, total_transactions, gross_profit, daily_breakdown });
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.revenueReport = revenueReport;
// GET /reports/top-products
const topProductsReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const limit = parseInt(req.query.limit) || 10;
    try {
        const data = yield prisma_1.default.transaction_items.findMany({
            where: { item_type: 'spare_part' },
            select: { item_name: true, spare_part_id: true, quantity: true, unit_price: true }
        });
        const aggregated = {};
        data.forEach((item) => {
            var _a;
            const key = String((_a = item.spare_part_id) !== null && _a !== void 0 ? _a : item.item_name);
            if (!aggregated[key])
                aggregated[key] = { name: item.item_name, total_qty: 0, revenue: 0 };
            aggregated[key].total_qty += item.quantity;
            aggregated[key].revenue += (item.quantity * Number(item.unit_price));
        });
        const result = Object.values(aggregated)
            .sort((a, b) => b.total_qty - a.total_qty)
            .slice(0, limit);
        return (0, response_1.successResponse)(res, result);
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.topProductsReport = topProductsReport;
// GET /reports/top-services
const topServicesReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const limit = parseInt(req.query.limit) || 10;
    try {
        const data = yield prisma_1.default.transaction_items.findMany({
            where: { item_type: 'jasa' },
            select: { item_name: true, spare_part_id: true, quantity: true, unit_price: true }
        });
        const aggregated = {};
        data.forEach((item) => {
            var _a;
            const key = String((_a = item.spare_part_id) !== null && _a !== void 0 ? _a : item.item_name);
            if (!aggregated[key])
                aggregated[key] = { name: item.item_name, count: 0, revenue: 0 };
            aggregated[key].count += item.quantity;
            aggregated[key].revenue += (item.quantity * Number(item.unit_price));
        });
        const result = Object.values(aggregated)
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
        return (0, response_1.successResponse)(res, result);
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.topServicesReport = topServicesReport;
// GET /reports/low-stock
const lowStockReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield prisma_1.default.spare_parts.findMany({
            where: { deleted_at: null },
            select: { id: true, name: true, sku: true, current_stock: true, minimum_stock: true, unit: true, categories: { select: { name: true } } },
            orderBy: { current_stock: 'asc' }
        });
        const lowStock = data.filter((item) => item.current_stock < item.minimum_stock);
        return (0, response_1.successResponse)(res, lowStock);
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.lowStockReport = lowStockReport;
// GET /reports/opname/:id
const opnameReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield prisma_1.default.stock_opnames.findUnique({
            where: { id: Number(req.params.id) },
            include: {
                stock_opname_items: { include: { spare_parts: { select: { name: true, sku: true } } } }
            }
        });
        if (!data)
            return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Opname tidak ditemukan', 404);
        const items = data.stock_opname_items || [];
        const summary = {
            total_items: items.length,
            items_with_difference: items.filter((i) => i.physical_count !== null && i.physical_count !== i.system_stock).length,
            items_ok: items.filter((i) => i.physical_count === i.system_stock).length
        };
        return (0, response_1.successResponse)(res, Object.assign(Object.assign({}, data), { summary }));
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.opnameReport = opnameReport;
// GET /reports/reminders
const remindersReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Logic: Find the latest transaction for each vehicle
        // If the latest transaction was more than 3 months ago, suggest a "Service Rutin" or "Ganti Oli"
        const latestTransactions = yield prisma_1.default.transactions.findMany({
            where: { payment_status: 'lunas' },
            include: {
                customers: { select: { name: true, phone: true } },
                vehicles: { select: { plate_number: true, brand: true, model: true, type: true } },
                transaction_items: true
            },
            orderBy: { transaction_date: 'desc' },
        });
        // Filter unique by vehicle_id
        const uniqueVehicles = new Map();
        latestTransactions.forEach(t => {
            if (t.vehicle_id && !uniqueVehicles.has(t.vehicle_id)) {
                uniqueVehicles.set(t.vehicle_id, t);
            }
        });
        const reminders = Array.from(uniqueVehicles.values()).map(t => {
            var _a, _b, _c, _d, _e;
            const lastDate = new Date(t.transaction_date);
            const today = new Date();
            const diffMonths = (today.getFullYear() - lastDate.getFullYear()) * 12 + (today.getMonth() - lastDate.getMonth());
            // Mocking logic for the sake of completeness if no real "due" logic exists
            // In real app, we might check odometer or specific service intervals
            let status = 'Aktif';
            if (diffMonths > 6)
                status = 'Lewat Jatuh Tempo';
            else if (diffMonths > 4)
                status = 'Terkirim';
            const nextServiceDate = new Date(lastDate);
            nextServiceDate.setMonth(nextServiceDate.getMonth() + 6);
            return {
                id: `REM-${t.id}`,
                pelanggan: ((_a = t.customers) === null || _a === void 0 ? void 0 : _a.name) || 'Umum',
                noPolisi: ((_b = t.vehicles) === null || _b === void 0 ? void 0 : _b.plate_number) || '-',
                kendaraan: `${((_c = t.vehicles) === null || _c === void 0 ? void 0 : _c.brand) || ''} ${((_d = t.vehicles) === null || _d === void 0 ? void 0 : _d.model) || ''}`.trim() || 'Kendaraan',
                phone: ((_e = t.customers) === null || _e === void 0 ? void 0 : _e.phone) || '-',
                jenisReminder: diffMonths > 6 ? 'Service Rutin' : 'Ganti Oli',
                jadwalTanggal: nextServiceDate.toISOString().split('T')[0],
                odometerSaat: 0, // In real app, get from last transaction note or metadata
                odometerTarget: 0,
                status: status,
                catatan: `Servis terakhir pada ${lastDate.toLocaleDateString('id-ID')}`
            };
        });
        return (0, response_1.successResponse)(res, reminders);
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.remindersReport = remindersReport;
const vehicleRatioReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const vehicles = yield prisma_1.default.vehicles.groupBy({
            by: ['type'],
            _count: {
                id: true
            }
        });
        const total = vehicles.reduce((sum, v) => sum + v._count.id, 0);
        const data = vehicles.map(v => ({
            label: v.type,
            value: v._count.id,
            percentage: total === 0 ? 0 : Math.round((v._count.id / total) * 100)
        }));
        return (0, response_1.successResponse)(res, data);
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.vehicleRatioReport = vehicleRatioReport;
const dashboardStatsReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const [activeQueue, completedToday, dailyRevenue, lowStockCount] = yield Promise.all([
            // 1. Antrean Aktif (menunggu + proses)
            prisma_1.default.work_orders.count({
                where: {
                    status: { in: ['menunggu', 'proses', 'dikerjakan'] },
                    deleted_at: null
                }
            }),
            // 2. Kendaraan Selesai (all completed for now since no updated_at)
            prisma_1.default.work_orders.count({
                where: {
                    status: 'selesai',
                    deleted_at: null
                }
            }),
            // 3. Pendapatan Hari Ini
            prisma_1.default.transactions.aggregate({
                where: {
                    transaction_date: { gte: today, lt: tomorrow },
                    payment_status: 'lunas'
                },
                _sum: {
                    total_amount: true
                }
            }),
            // 4. Menunggu Sparepart (stok menipis)
            prisma_1.default.spare_parts.count({
                where: {
                    current_stock: { lt: prisma_1.default.spare_parts.fields.minimum_stock },
                    deleted_at: null
                }
            })
        ]);
        // Calculate growth (mocked for now as we'd need yesterday's data too)
        return (0, response_1.successResponse)(res, {
            activeQueue: { value: activeQueue, growth: 10, isUp: true },
            completedTasks: { value: completedToday, growth: 5, isUp: true },
            dailyRevenue: {
                value: `Rp ${new Intl.NumberFormat('id-ID').format(Number(dailyRevenue._sum.total_amount || 0))}`,
                growth: 12,
                isUp: true
            },
            pendingSpareparts: { value: lowStockCount, growth: 2, isUp: false }
        });
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.dashboardStatsReport = dashboardStatsReport;
const recentActivitiesReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [transactions, workOrders, lowStock] = yield Promise.all([
            prisma_1.default.transactions.findMany({
                take: 5,
                orderBy: { created_at: 'desc' },
                include: { vehicles: { select: { plate_number: true } } }
            }),
            prisma_1.default.work_orders.findMany({
                take: 5,
                orderBy: { created_at: 'desc' },
                include: { vehicles: { select: { plate_number: true } } }
            }),
            prisma_1.default.spare_parts.findMany({
                where: { current_stock: { lt: prisma_1.default.spare_parts.fields.minimum_stock } },
                take: 3,
                orderBy: { updated_at: 'desc' }
            })
        ]);
        const activities = [];
        transactions.forEach(t => {
            activities.push({
                id: `trans-${t.id}`,
                type: 'payment',
                title: 'Pembayaran Diterima',
                description: `Invoice #${t.invoice_number} telah ${t.payment_status.replace('_', ' ')} sebesar Rp ${new Intl.NumberFormat('id-ID').format(Number(t.total_amount))}`,
                time: t.created_at,
                icon: 'Cash',
                color: 'bg-secondary/10 text-secondary'
            });
        });
        workOrders.forEach(w => {
            var _a;
            activities.push({
                id: `wo-${w.id}`,
                type: 'service',
                title: w.status === 'selesai' ? 'Servis Selesai' : 'Update Antrean',
                description: `${w.layanan} untuk ${((_a = w.vehicles) === null || _a === void 0 ? void 0 : _a.plate_number) || 'Kendaraan'} status: ${w.status}`,
                time: w.created_at,
                icon: w.status === 'selesai' ? 'Success' : 'Antrean',
                color: w.status === 'selesai' ? 'bg-green/10 text-green' : 'bg-blue/10 text-blue'
            });
        });
        lowStock.forEach(s => {
            activities.push({
                id: `stock-${s.id}`,
                type: 'inventory',
                title: 'Stok Menipis',
                description: `Stok ${s.name} tersisa ${s.current_stock} ${s.unit}. Segera restock!`,
                time: s.updated_at,
                icon: 'Warning',
                color: 'bg-red/10 text-red'
            });
        });
        const sortedActivities = activities
            .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
            .slice(0, 10);
        return (0, response_1.successResponse)(res, sortedActivities);
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.recentActivitiesReport = recentActivitiesReport;
