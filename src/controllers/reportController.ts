import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';

// GET /reports/revenue?period=monthly&date=2026-03
export const revenueReport = async (req: Request, res: Response) => {
    const { period, date } = req.query;
    if (!period || !date) {
        return errorResponse(res, 'VALIDATION_ERROR', 'period dan date wajib diisi', 422);
    }

    try {
        let startDate: Date, endDate: Date;
        if (period === 'monthly') {
            const [y, m] = (date as string).split('-').map(Number);
            startDate = new Date(y, m - 1, 1);
            const lastDay = new Date(y, m, 0).getDate();
            endDate = new Date(y, m - 1, lastDay, 23, 59, 59, 999);
        } else {
            startDate = new Date(date as string);
            endDate = new Date(date as string + 'T23:59:59.999Z');
        }

        const transactions = await prisma.transactions.findMany({
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
                const costPrice = Number(item.spare_parts?.cost_price ?? 0);
                return c + (item.quantity * costPrice);
            }, 0);
            return sum + (Number(t.total_amount) - cost);
        }, 0);

        // Daily breakdown
        const dailyMap: Record<string, number> = {};
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

        return successResponse(res, { period: date, total_revenue, total_transactions, gross_profit, daily_breakdown });
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// GET /reports/top-products
export const topProductsReport = async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;

    try {
        const data = await prisma.transaction_items.findMany({
            where: { item_type: 'spare_part' },
            select: { item_name: true, spare_part_id: true, quantity: true, unit_price: true }
        });

        const aggregated: Record<string, { name: string; total_qty: number; revenue: number }> = {};
        data.forEach((item) => {
            const key = String(item.spare_part_id ?? item.item_name);
            if (!aggregated[key]) aggregated[key] = { name: item.item_name, total_qty: 0, revenue: 0 };
            aggregated[key].total_qty += item.quantity;
            aggregated[key].revenue += (item.quantity * Number(item.unit_price));
        });

        const result = Object.values(aggregated)
            .sort((a, b) => b.total_qty - a.total_qty)
            .slice(0, limit);

        return successResponse(res, result);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// GET /reports/top-services
export const topServicesReport = async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;

    try {
        const data = await prisma.transaction_items.findMany({
            where: { item_type: 'jasa' },
            select: { item_name: true, spare_part_id: true, quantity: true, unit_price: true }
        });

        const aggregated: Record<string, { name: string; count: number; revenue: number }> = {};
        data.forEach((item) => {
            const key = String(item.spare_part_id ?? item.item_name);
            if (!aggregated[key]) aggregated[key] = { name: item.item_name, count: 0, revenue: 0 };
            aggregated[key].count += item.quantity;
            aggregated[key].revenue += (item.quantity * Number(item.unit_price));
        });

        const result = Object.values(aggregated)
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);

        return successResponse(res, result);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// GET /reports/low-stock
export const lowStockReport = async (req: Request, res: Response) => {
    try {
        const data = await prisma.spare_parts.findMany({
            where: { deleted_at: null },
            select: { id: true, name: true, sku: true, current_stock: true, minimum_stock: true, unit: true, categories: { select: { name: true } } },
            orderBy: { current_stock: 'asc' }
        });

        const lowStock = data.filter((item) => item.current_stock < item.minimum_stock);
        return successResponse(res, lowStock);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// GET /reports/opname/:id
export const opnameReport = async (req: Request, res: Response) => {
    try {
        const data = await prisma.stock_opnames.findUnique({
            where: { id: Number(req.params.id) },
            include: {
                stock_opname_items: { include: { spare_parts: { select: { name: true, sku: true } } } }
            }
        });

        if (!data) return errorResponse(res, 'NOT_FOUND', 'Opname tidak ditemukan', 404);

        const items = data.stock_opname_items || [];
        const summary = {
            total_items: items.length,
            items_with_difference: items.filter((i) => i.physical_count !== null && i.physical_count !== i.system_stock).length,
            items_ok: items.filter((i) => i.physical_count === i.system_stock).length
        };

        return successResponse(res, { ...data, summary });
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// GET /reports/reminders
export const remindersReport = async (req: Request, res: Response) => {
    try {
        // Logic: Find the latest transaction for each vehicle
        // If the latest transaction was more than 3 months ago, suggest a "Service Rutin" or "Ganti Oli"
        const latestTransactions = await prisma.transactions.findMany({
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
            const lastDate = new Date(t.transaction_date);
            const today = new Date();
            const diffMonths = (today.getFullYear() - lastDate.getFullYear()) * 12 + (today.getMonth() - lastDate.getMonth());
            
            // Mocking logic for the sake of completeness if no real "due" logic exists
            // In real app, we might check odometer or specific service intervals
            let status = 'Aktif';
            if (diffMonths > 6) status = 'Lewat Jatuh Tempo';
            else if (diffMonths > 4) status = 'Terkirim';

            const nextServiceDate = new Date(lastDate);
            nextServiceDate.setMonth(nextServiceDate.getMonth() + 6);

            return {
                id: `REM-${t.id}`,
                pelanggan: t.customers?.name || 'Umum',
                noPolisi: t.vehicles?.plate_number || '-',
                kendaraan: `${t.vehicles?.brand || ''} ${t.vehicles?.model || ''}`.trim() || 'Kendaraan',
                phone: t.customers?.phone || '-',
                jenisReminder: diffMonths > 6 ? 'Service Rutin' : 'Ganti Oli',
                jadwalTanggal: nextServiceDate.toISOString().split('T')[0],
                odometerSaat: 0, // In real app, get from last transaction note or metadata
                odometerTarget: 0,
                status: status,
                catatan: `Servis terakhir pada ${lastDate.toLocaleDateString('id-ID')}`
            };
        });

        return successResponse(res, reminders);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

export const vehicleRatioReport = async (req: Request, res: Response) => {
    try {
        const vehicles = await prisma.vehicles.groupBy({
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

        return successResponse(res, data);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};
