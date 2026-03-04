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
exports.sendTestNotification = exports.listNotifications = void 0;
const supabase_1 = require("../config/supabase");
const response_1 = require("../utils/response");
// GET /notifications/wa
const listNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // TODO: Integrate with WA gateway (Fonntes/Wablas). Storage for sent logs
    return (0, response_1.successResponse)(res, [], 'Fitur WA Notification belum diintegrasikan');
});
exports.listNotifications = listNotifications;
// POST /notifications/wa/test
const sendTestNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data: settings } = yield supabase_1.supabase.from('settings').select('wa_target_number, wa_gateway_token').single();
    if (!(settings === null || settings === void 0 ? void 0 : settings.wa_target_number) || !(settings === null || settings === void 0 ? void 0 : settings.wa_gateway_token)) {
        return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'WA config belum diset di Settings. Lengkapi wa_target_number dan wa_gateway_token terlebih dahulu.', 422);
    }
    // TODO: Call real WA gateway API (Fonntes/Wablas)
    return (0, response_1.successResponse)(res, {
        to: settings.wa_target_number,
        message: 'Ini adalah pesan test dari AutoService BE.',
        note: 'Integrasi WA Gateway belum diimplementasikan. Tambahkan API call ke Fonntes/Wablas di sini.'
    }, 'Test notification (dummy response)');
});
exports.sendTestNotification = sendTestNotification;
