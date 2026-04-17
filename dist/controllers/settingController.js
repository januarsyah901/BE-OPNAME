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
exports.updateSettings = exports.getSettings = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const response_1 = require("../utils/response");
// GET /settings
const getSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield prisma_1.default.bengkel_profile.findFirst();
        if (!data)
            return (0, response_1.errorResponse)(res, "NOT_FOUND", "Profile bengkel tidak ditemukan", 404);
        return (0, response_1.successResponse)(res, data);
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, "SERVER_ERROR", e.message, 500);
    }
});
exports.getSettings = getSettings;
// PUT /settings
const updateSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, address, phone, logo_url, wa_gateway_token, wa_target_number, wa_bot_enabled, wa_template_stok, wa_template_dikerjakan, wa_template_selesai, open_time, close_time, operational_days, tax_percentage } = req.body;
    try {
        const data = yield prisma_1.default.bengkel_profile.upsert({
            where: { id: 1 },
            update: {
                name,
                address,
                phone,
                logo_url,
                wa_gateway_token,
                wa_target_number,
                wa_bot_enabled: wa_bot_enabled !== undefined ? Boolean(wa_bot_enabled) : undefined,
                wa_template_stok,
                wa_template_dikerjakan,
                wa_template_selesai,
                open_time,
                close_time,
                operational_days,
                tax_percentage: tax_percentage !== undefined ? Number(tax_percentage) : undefined,
            },
            create: {
                id: 1,
                name: name || "Bengkel AutoService",
                address,
                phone,
                logo_url,
                wa_gateway_token,
                wa_target_number,
                wa_bot_enabled: wa_bot_enabled !== undefined ? Boolean(wa_bot_enabled) : true,
                wa_template_stok,
                wa_template_dikerjakan,
                wa_template_selesai,
                open_time,
                close_time,
                operational_days,
                tax_percentage: tax_percentage !== undefined ? Number(tax_percentage) : 0,
            },
        });
        return (0, response_1.successResponse)(res, data, "Settings berhasil diupdate");
    }
    catch (e) {
        return (0, response_1.errorResponse)(res, "SERVER_ERROR", e.message, 500);
    }
});
exports.updateSettings = updateSettings;
