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
exports.updateVehicle = exports.createVehicle = exports.listVehicles = void 0;
const supabase_1 = require("../config/supabase");
const response_1 = require("../utils/response");
// GET /customers/:customerId/vehicles
const listVehicles = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { customerId } = req.params;
    const { data, error } = yield supabase_1.supabase
        .from('vehicles')
        .select('*')
        .eq('customer_id', customerId)
        .order('id');
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    return (0, response_1.successResponse)(res, data);
});
exports.listVehicles = listVehicles;
// POST /customers/:customerId/vehicles
const createVehicle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { customerId } = req.params;
    const { plate_number, type, brand, model, year } = req.body;
    if (!plate_number || !type) {
        return (0, response_1.errorResponse)(res, 'VALIDATION_ERROR', 'plate_number dan type wajib diisi', 422);
    }
    const { data, error } = yield supabase_1.supabase
        .from('vehicles')
        .insert([{ customer_id: customerId, plate_number, type, brand, model, year }])
        .select()
        .single();
    if (error)
        return (0, response_1.errorResponse)(res, 'SERVER_ERROR', error.message, 500);
    return (0, response_1.successResponse)(res, data, 'Kendaraan berhasil ditambahkan', 201);
});
exports.createVehicle = createVehicle;
// PUT /vehicles/:id
const updateVehicle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { plate_number, type, brand, model, year } = req.body;
    const { data, error } = yield supabase_1.supabase
        .from('vehicles')
        .update({ plate_number, type, brand, model, year, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error || !data)
        return (0, response_1.errorResponse)(res, 'NOT_FOUND', 'Kendaraan tidak ditemukan', 404);
    return (0, response_1.successResponse)(res, data, 'Kendaraan berhasil diupdate');
});
exports.updateVehicle = updateVehicle;
