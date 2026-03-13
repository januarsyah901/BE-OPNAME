import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { getPagination } from '../utils/helpers';

// ===========================================================================
// GET /reminders
// ===========================================================================
export const listReminders = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const { from, perPage } = getPagination(page);
    const { status, customer_id, vehicle_id } = req.query;

    try {
        const where: any = { deleted_at: null };
        if (status) where.status = String(status);
        if (customer_id) where.customer_id = Number(customer_id);
        if (vehicle_id) where.vehicle_id = Number(vehicle_id);

        const [data, total] = await Promise.all([
            prisma.reminders.findMany({
                where,
                include: {
                    customers: { select: { id: true, name: true, phone: true } },
                    vehicles: { select: { id: true, plate_number: true, type: true, brand: true, model: true } }
                },
                orderBy: { jadwal_tanggal: 'asc' },
                skip: from,
                take: perPage
            }),
            prisma.reminders.count({ where })
        ]);

        // Transform to match frontend expected CamelCase if needed, 
        // but it's better to keep it consistent with the API style
        const transformed = data.map((r: any) => ({
            id: r.id,
            customer_id: r.customer_id,
            vehicle_id: r.vehicle_id,
            pelanggan: r.customers.name,
            phone: r.customers.phone,
            noPolisi: r.vehicles.plate_number,
            kendaraan: `${r.vehicles.brand || ''} ${r.vehicles.model || ''}`.trim(),
            jenisReminder: r.jenis_reminder,
            jadwalTanggal: r.jadwal_tanggal,
            odometerSaat: r.odometer_saat,
            odometerTarget: r.odometer_target,
            status: r.status === 'aktif' ? 'Aktif' : r.status === 'terkirim' ? 'Terkirim' : 'Lewat Jatuh Tempo', // Mapping to frontend display
            catatan: r.catatan,
            created_at: r.created_at
        }));

        return successResponse(res, transformed, 'OK', 200, { page, total, per_page: perPage });
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// ===========================================================================
// POST /reminders
// ===========================================================================
export const createReminder = async (req: Request, res: Response) => {
    const {
        customer_id,
        vehicle_id,
        jenis_reminder,
        jadwal_tanggal,
        odometer_saat,
        odometer_target,
        catatan,
        status
    } = req.body;

    if (!customer_id || !vehicle_id || !jenis_reminder || !jadwal_tanggal) {
        return errorResponse(res, 'VALIDATION_ERROR', 'Field customer_id, vehicle_id, jenis_reminder, dan jadwal_tanggal wajib diisi', 422);
    }

    try {
        const reminder = await prisma.reminders.create({
            data: {
                customer_id: Number(customer_id),
                vehicle_id: Number(vehicle_id),
                jenis_reminder: String(jenis_reminder),
                jadwal_tanggal: new Date(jadwal_tanggal),
                odometer_saat: odometer_saat ? Number(odometer_saat) : null,
                odometer_target: odometer_target ? Number(odometer_target) : null,
                catatan: catatan ?? null,
                status: status ?? 'aktif'
            },
            include: {
                customers: { select: { name: true, phone: true } },
                vehicles: { select: { plate_number: true, brand: true, model: true } }
            }
        });

        return successResponse(res, reminder, 'Reminder berhasil dibuat', 201);
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// ===========================================================================
// GET /reminders/:id
// ===========================================================================
export const getReminder = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const reminder = await prisma.reminders.findFirst({
            where: { id: Number(id), deleted_at: null },
            include: {
                customers: { select: { id: true, name: true, phone: true } },
                vehicles: { select: { id: true, plate_number: true, brand: true, model: true } }
            }
        });

        if (!reminder) return errorResponse(res, 'NOT_FOUND', 'Reminder tidak ditemukan', 404);

        return successResponse(res, reminder, 'OK');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// ===========================================================================
// PUT /reminders/:id
// ===========================================================================
export const updateReminder = async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
        jenis_reminder,
        jadwal_tanggal,
        odometer_saat,
        odometer_target,
        catatan,
        status
    } = req.body;

    try {
        const existing = await prisma.reminders.findFirst({
            where: { id: Number(id), deleted_at: null }
        });
        if (!existing) return errorResponse(res, 'NOT_FOUND', 'Reminder tidak ditemukan', 404);

        const updated = await prisma.reminders.update({
            where: { id: Number(id) },
            data: {
                ...(jenis_reminder !== undefined && { jenis_reminder: String(jenis_reminder) }),
                ...(jadwal_tanggal !== undefined && { jadwal_tanggal: new Date(jadwal_tanggal) }),
                ...(odometer_saat !== undefined && { odometer_saat: odometer_saat ? Number(odometer_saat) : null }),
                ...(odometer_target !== undefined && { odometer_target: odometer_target ? Number(odometer_target) : null }),
                ...(catatan !== undefined && { catatan }),
                ...(status !== undefined && { status })
            }
        });

        return successResponse(res, updated, 'Reminder berhasil diupdate');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// ===========================================================================
// DELETE /reminders/:id
// ===========================================================================
export const deleteReminder = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const existing = await prisma.reminders.findFirst({
            where: { id: Number(id), deleted_at: null }
        });
        if (!existing) return errorResponse(res, 'NOT_FOUND', 'Reminder tidak ditemukan', 404);

        await prisma.reminders.update({
            where: { id: Number(id) },
            data: { deleted_at: new Date() }
        });

        return successResponse(res, null, 'Reminder berhasil dihapus');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};

// ===========================================================================
// POST /reminders/send-wa/:id
// ===========================================================================
export const sendReminderWa = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const reminder = await prisma.reminders.findFirst({
            where: { id: Number(id), deleted_at: null },
            include: {
                customers: { select: { name: true, phone: true } },
                vehicles: { select: { plate_number: true, brand: true, model: true } }
            }
        });

        if (!reminder) return errorResponse(res, 'NOT_FOUND', 'Reminder tidak ditemukan', 404);
        if (!reminder.customers.phone) return errorResponse(res, 'VALIDATION_ERROR', 'Nomor telepon pelanggan tidak tersedia', 422);

        const settings = await prisma.bengkel_profile.findFirst();
        
        const defaultMessage = 
            `Halo Bpk/Ibu *${reminder.customers.name}*,\n\n` +
            `Sekedar mengingatkan jadwal *${reminder.jenis_reminder}* untuk kendaraan *${reminder.vehicles.plate_number}* (${reminder.vehicles.brand} ${reminder.vehicles.model}) ` +
            `pada tanggal *${new Date(reminder.jadwal_tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}*.\n\n` +
            `Silakan kunjungi bengkel kami untuk perawatan unit kesayangan Anda agar performa tetap prima. 🙏\n\n` +
            `*AutoService*`;

        // Masukkan ke antrian (pending)
        await prisma.wa_notifications.create({
            data: {
                wa_number: reminder.customers.phone.replace(/\D/g, ''),
                message_body: defaultMessage,
                status: 'pending'
            }
        });

        // Update status reminder
        await prisma.reminders.update({
            where: { id: reminder.id },
            data: { status: 'terkirim' }
        });

        return successResponse(res, null, 'Pesan pengingat telah ditambahkan ke antrian WhatsApp.');
    } catch (e: any) {
        return errorResponse(res, 'SERVER_ERROR', e.message, 500);
    }
};
