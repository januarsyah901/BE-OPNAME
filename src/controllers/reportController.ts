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
            select: { item_name: true, spare_part_id: true, quantity: true }
        });

        const aggregated: Record<string, { name: string; total_qty: number }> = {};
        data.forEach((item) => {
            const key = String(item.spare_part_id ?? item.item_name);
            if (!aggregated[key]) aggregated[key] = { name: item.item_name, total_qty: 0 };
            aggregated[key].total_qty += item.quantity;
        });

        const result = Object.values(aggregated)
            .sort((a, b) => b.total_qty - a.total_qty)
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
