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
exports.clearNotifications = exports.retryNotification = exports.sendTestNotification = exports.sendManualNotification = exports.restartWa = exports.getWaQrCode = exports.getWaClientStatus = exports.listNotifications = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const response_1 = require("../utils/response");
const helpers_1 = require("../utils/helpers");
const waClientService_1 = require("../services/waClientService");
// ===========================================================================
// WA Log Endpoints
// ===========================================================================
/**
 * GET /notifications/wa
 * List log notifikasi WA (paginasi, filter status)
 */
const listNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const { from, perPage } = (0, helpers_1.getPagination)(page);
    const { status } = req.query;
    try {
        const where = {};
        if (status)
            where.status = String(status);
        const [data, total] = yield Promise.all([
            prisma_1.default.wa_notifications.findMany({
                where,
                include: {
                    spare_parts: { select: { name: true, sku: true } }
                },
                orderBy: { created_at: 'desc' },
                skip: from,
                take: perPage
            }),
            prisma_1.default.wa_notifications.count({ where })
        ]);
        return (0, response_1.successResponse)(res, data, 'OK', 200, { page, total, per_page: perPage });
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.listNotifications = listNotifications;
// ===========================================================================
// WA Client / Gateway Endpoints
// ===========================================================================
/**
 * GET /notifications/wa/status
 * Status koneksi WA Web.js client saat ini
 */
const getWaClientStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield (0, waClientService_1.getWaStatusFromDb)();
    return (0, response_1.successResponse)(res, Object.assign(Object.assign({}, data), { note: data.status === 'disconnected'
            ? 'WA Worker tidak aktif. Jalankan `npm run wa:worker` di lokal untuk mengaktifkan notifikasi WA.'
            : null }), 'OK');
});
exports.getWaClientStatus = getWaClientStatus;
/**
 * GET /notifications/wa/qr
 * Ambil QR code (base64 data URL) untuk di-scan via WhatsApp
 */
const getWaQrCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { status } = yield (0, waClientService_1.getWaStatusFromDb)();
    if (status === 'ready' || status === 'authenticated') {
        return (0, response_1.successResponse)(res, { status, qr: null }, 'WA sudah terkoneksi, tidak perlu scan QR.');
    }
    /* Kita hapus cek disconnected di sini agar user tetap bisa dapet QR kalau worker nyala belakangan
    if (status === 'disconnected') {
        return errorResponse(
            res,
            'WA_WORKER_NOT_RUNNING',
            'WA Worker tidak aktif. Jalankan `npm run wa:worker` di lokal untuk memulai koneksi dan mendapatkan QR.',
            503
        );
    }
    */
    const qr = yield (0, waClientService_1.getWaQrFromDb)();
    if (!qr) {
        return (0, response_1.errorResponse)(res, 'QR_NOT_READY', 'QR belum tersedia atau sudah expired. Tunggu sebentar lalu coba lagi, atau restart client.', 404);
    }
    return (0, response_1.successResponse)(res, { status, qr }, 'QR tersedia, silakan scan dengan WhatsApp.');
});
exports.getWaQrCode = getWaQrCode;
/**
 * POST /notifications/wa/restart
 * Restart WA client (menghapus sesi lama + inisialisasi ulang / scan QR baru)
 */
const restartWa = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        (0, waClientService_1.restartWaClient)();
        return (0, response_1.successResponse)(res, { status: 'initializing' }, 'WA client sedang di-restart. Tunggu QR baru dalam beberapa detik.');
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.restartWa = restartWa;
/**
 * POST /notifications/wa/send
 * Kirim pesan WA manual (dimasukkan ke antrian)
 */
const sendManualNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { phone, message } = req.body;
    if (!phone || !message) {
        return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'Phone and message are required', 422);
    }
    try {
        const { status } = yield (0, waClientService_1.getWaStatusFromDb)();
        if (status !== 'ready') {
            return (0, response_1.errorResponse)(res, 'WA_NOT_READY', `WA client belum siap (status: ${status}). Scan QR terlebih dahulu via Dashboard.`, 422);
        }
        // Masukkan ke antrian (pending)
        const notif = yield prisma_1.default.wa_notifications.create({
            data: {
                wa_number: phone.replace(/\D/g, ''),
                message_body: message,
                status: 'pending'
            }
        });
        return (0, response_1.successResponse)(res, {
            notification_id: notif.id,
            to: phone,
            status: 'pending'
        }, 'Pesan telah ditambahkan ke antrian pengiriman (Bot).');
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.sendManualNotification = sendManualNotification;
/**
 * POST /notifications/wa/test
 * Kirim pesan WA test ke nomor owner (dari settings)
 */
const sendTestNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status } = yield (0, waClientService_1.getWaStatusFromDb)();
        if (status !== 'ready') {
            return (0, response_1.errorResponse)(res, 'WA_NOT_READY', `WA client belum siap (status: ${status}). Scan QR terlebih dahulu via Dashboard.`, 422);
        }
        const settings = yield prisma_1.default.bengkel_profile.findFirst();
        if (!(settings === null || settings === void 0 ? void 0 : settings.wa_target_number)) {
            return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'wa_target_number belum diset di Settings.', 422);
        }
        const message = `✅ *Test Notifikasi AutoService*\n\n` +
            `Ini adalah pesan test dari sistem inventori bengkel.\n` +
            `Jika Anda menerima pesan ini, WhatsApp Gateway sudah terkonfigurasi dengan benar.`;
        // Masukkan ke antrian (pending)
        // Biarkan WA Worker yang memproses pengirimannya secara asinkron
        const notif = yield prisma_1.default.wa_notifications.create({
            data: {
                spare_part_id: null,
                wa_number: settings.wa_target_number,
                message_body: message,
                status: 'pending'
            }
        });
        return (0, response_1.successResponse)(res, {
            notification_id: notif.id,
            to: settings.wa_target_number,
            status: 'pending'
        }, 'Pesan test telah ditambahkan ke antrian pengiriman (Worker). Cek log dalam beberapa detik.');
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.sendTestNotification = sendTestNotification;
/**
 * POST /notifications/wa/retry/:id
 * Retry kirim notifikasi yang gagal (status: failed)
 */
const retryNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const notif = yield prisma_1.default.wa_notifications.findUnique({
            where: { id: Number(id) }
        });
        if (!notif) {
            return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Notifikasi tidak ditemukan', 404);
        }
        if (notif.status === 'sent') {
            return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'Notifikasi ini sudah berhasil dikirim sebelumnya', 422);
        }
        const { status } = yield (0, waClientService_1.getWaStatusFromDb)();
        if (status !== 'ready') {
            return (0, response_1.errorResponse)(res, 'WA_NOT_READY', `WA client belum siap (status: ${status}). Scan QR terlebih dahulu.`, 422);
        }
        // Cukup update ke pending. Worker akan otomatis pick up di siklus polling berikutnya.
        const updated = yield prisma_1.default.wa_notifications.update({
            where: { id: Number(id) },
            data: {
                status: 'pending',
                sent_at: null // Reset jika sbelumnya ada
            }
        });
        return (0, response_1.successResponse)(res, updated, 'Notifikasi telah dimasukkan kembali ke antrian (Worker).');
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.retryNotification = retryNotification;
/**
 * DELETE /notifications/wa
 * Hapus semua log notifikasi
 */
const clearNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.default.wa_notifications.deleteMany();
        return (0, response_1.successResponse)(res, null, 'Semua log notifikasi berhasil dihapus');
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', e.message, 500);
    }
});
exports.clearNotifications = clearNotifications;
