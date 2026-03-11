import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { generateInvoiceNumber, getPagination } from '../utils/helpers';

// GET /transactions
export const listTransactions = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const { from, perPage } = getPagination(page);
    const { date, status, plate_number } = req.query;

    try {
        const where: any = {};
        if (date) where.transaction_date = new Date(date as string);
        if (status) where.payment_status = String(status);
        if (plate_number) {
            where.vehicles = {
                plate_number: String(plate_number)
            };
        }

        const [data, total] = await Promise.all([
            prisma.transactions.findMany({
                where,
                include: {
                    customers: { select: { name: true } },
                    vehicles: { select: { plate_number: true } },
                    transaction_items: true
                },
                orderBy: { transaction_date: 'desc' },
                skip: from,
                take: perPage
            }),
            prisma.transactions.count({ where })
        ]);

        return successResponse(res, data, 'OK', 200, { page, total, per_page: perPage });
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// POST /transactions
export const createTransaction = async (req: Request, res: Response) => {
    const { customer_id, vehicle_id, transaction_date, payment_method, notes, items } = req.body;

    if (!customer_id || !vehicle_id || !transaction_date || !items || items.length === 0) {
        return errorResponse(res, 'VALIDATION_ERROR', 'customer_id, vehicle_id, transaction_date, items wajib diisi', 422);
    }

    const userId = (req as any).user?.id ?? null;

    try {
        // Cek stok semua spare part yang digunakan
        for (const item of items) {
            if (item.item_type === 'spare_part' && item.spare_part_id) {
                const part = await prisma.spare_parts.findUnique({
                    where: { id: Number(item.spare_part_id) },
                    select: { current_stock: true, name: true }
                });
                if (!part) return errorResponse(res, 'NOT_FOUND', `Spare part ID ${item.spare_part_id} tidak ditemukan`, 404);
                if (part.current_stock < item.quantity) {
                    return errorResponse(res, 'STOCK_INSUFFICIENT', `Stok "${part.name}" tidak cukup. Tersedia: ${part.current_stock}`, 422);
                }
            }
        }

        // Hitung total
        const total_amount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

        // Generate invoice number
        const today = new Date();
        const seqCount = await prisma.transactions.count({
            where: { created_at: { gte: new Date(today.toISOString().split('T')[0]) } }
        });
        const invoice_number = generateInvoiceNumber(today, seqCount + 1);

        // Insert transaction
        const transaction = await prisma.transactions.create({
            data: {
                customer_id: Number(customer_id),
                vehicle_id: Number(vehicle_id),
                user_id: userId,
                transaction_date: new Date(transaction_date),
                total_amount,
                paid_amount: 0,
                payment_method: payment_method || 'cash',
                payment_status: 'belum_bayar',
                notes,
                invoice_number
            }
        });

        // Insert transaction items with subtotal
        const itemsToInsert = items.map((item: any) => ({
            transaction_id: transaction.id,
            item_type: item.item_type,
            spare_part_id: item.spare_part_id ? Number(item.spare_part_id) : null,
            item_name: item.item_name,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            subtotal: Number(item.quantity) * Number(item.unit_price)
        }));

        await prisma.transaction_items.createMany({ data: itemsToInsert });

        // Kurangi stok & catat movement
        for (const item of items) {
            if (item.item_type === 'spare_part' && item.spare_part_id) {
                const part = await prisma.spare_parts.findUnique({
                    where: { id: Number(item.spare_part_id) },
                    select: { current_stock: true }
                });
                if (part) {
                    const newStock = part.current_stock - Number(item.quantity);
                    await prisma.spare_parts.update({
                        where: { id: Number(item.spare_part_id) },
                        data: { current_stock: newStock }
                    });
                    await prisma.stock_movements.create({
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

        return successResponse(res, { ...transaction, items: itemsToInsert }, 'Transaksi berhasil dibuat', 201);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// GET /transactions/:id
export const getTransaction = async (req: Request, res: Response) => {
    try {
        const data = await prisma.transactions.findUnique({
            where: { id: Number(req.params.id) },
            include: {
                customers: { select: { name: true, phone: true } },
                vehicles: { select: { plate_number: true, type: true, brand: true, model: true } },
                transaction_items: true
            }
        });
        if (!data) return errorResponse(res, 'NOT_FOUND', 'Transaksi tidak ditemukan', 404);
        return successResponse(res, data);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// PATCH /transactions/:id/payment
export const updatePayment = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { paid_amount, payment_status } = req.body;

    if (paid_amount === undefined || !payment_status) {
        return errorResponse(res, 'VALIDATION_ERROR', 'paid_amount dan payment_status wajib diisi', 422);
    }

    try {
        const data = await prisma.transactions.update({
            where: { id: Number(id) },
            data: { paid_amount: Number(paid_amount), payment_status }
        });
        return successResponse(res, data, 'Status pembayaran berhasil diupdate');
    } catch (e: any) {
        return errorResponse(res, 'NOT_FOUND', 'Transaksi tidak ditemukan', 404);
    }
};

// GET /transactions/:id/pdf
export const getTransactionPdf = async (req: Request, res: Response) => {
    try {
        const data = await prisma.transactions.findUnique({
            where: { id: Number(req.params.id) },
            select: { invoice_number: true }
        });
        if (!data) return errorResponse(res, 'NOT_FOUND', 'Transaksi tidak ditemukan', 404);
        return successResponse(res, { message: 'PDF generation not yet implemented', invoice_number: data.invoice_number });
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};
