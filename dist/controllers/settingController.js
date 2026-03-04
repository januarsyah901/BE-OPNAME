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
exports.updateSettings = exports.getSettings = void 0;
const supabase_1 = require("../config/supabase");
const response_1 = require("../utils/response");
// GET /settings
const getSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase_1.supabase.from('settings').select('*').limit(1).single();
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    return (0, response_1.successResponse)(res, data);
});
exports.getSettings = getSettings;
// PUT /settings
const updateSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, address, phone, wa_gateway_token, wa_target_number } = req.body;
    // Always update row id=1 (singleton pattern)
    const { data, error } = yield supabase_1.supabase
        .from('settings')
        .update({ name, address, phone, wa_gateway_token, wa_target_number, updated_at: new Date().toISOString() })
        .eq('id', 1)
        .select()
        .single();
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    return (0, response_1.successResponse)(res, data, 'Settings berhasil diupdate');
});
exports.updateSettings = updateSettings;
