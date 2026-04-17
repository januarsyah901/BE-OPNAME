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
exports.refresh = exports.logout = exports.me = exports.login = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const env_1 = require("../config/env");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(422).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Username and password are required' }
            });
        }
        const user = yield prisma_1.default.users.findFirst({
            where: { username, deleted_at: null }
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' }
            });
        }
        // Compare password hash with bcrypt
        const isValid = yield bcryptjs_1.default.compare(password, (_a = user.password_hash) !== null && _a !== void 0 ? _a : '');
        // Fallback: allow plain 'secret' for development
        if (!isValid && password !== 'secret') {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' }
            });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, role: user.role }, env_1.config.jwtSecret || 'supersecretkey', { expiresIn: '15m' } // Access token berumur 15 menit
        );
        const refreshToken = jsonwebtoken_1.default.sign({ id: user.id }, env_1.config.jwtSecret || 'supersecretkey', { expiresIn: '30d' } // Refresh token berumur 30 hari
        );
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        // Simpan refresh token di DB
        yield prisma_1.default.refresh_tokens.create({
            data: {
                user_id: user.id,
                token: refreshToken,
                expires_at: expiresAt
            }
        });
        return res.status(200).json({
            success: true,
            data: {
                token,
                refresh_token: refreshToken,
                expires_in: 900, // 15 menit (dalam detik)
                user: { id: user.id, name: user.name, username: user.username, role: user.role }
            },
            message: 'OK'
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        });
    }
});
exports.login = login;
const me = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Token missing' } });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret || 'supersecretkey');
        const user = yield prisma_1.default.users.findFirst({
            where: { id: decoded.id, deleted_at: null },
            select: { id: true, name: true, username: true, role: true }
        });
        if (!user) {
            return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid user' } });
        }
        return res.status(200).json({ success: true, data: { user }, message: 'OK' });
    }
    catch (err) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
    }
});
exports.me = me;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { refresh_token } = req.body;
        if (refresh_token) {
            // Hapus refresh token dari DB jika dikirim
            yield prisma_1.default.refresh_tokens.deleteMany({
                where: { token: refresh_token }
            });
        }
        return res.status(200).json({ success: true, data: null, message: 'Logged out successfully' });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
    }
});
exports.logout = logout;
const refresh = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { refresh_token } = req.body;
        if (!refresh_token) {
            return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Refresh token is required' } });
        }
        // Cek apakah refresh token valid dan masih terdaftar di DB
        const dbToken = yield prisma_1.default.refresh_tokens.findFirst({
            where: { token: refresh_token }
        });
        if (!dbToken || dbToken.expires_at < new Date()) {
            return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' } });
        }
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(refresh_token, env_1.config.jwtSecret || 'supersecretkey');
        }
        catch (err) {
            return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid refresh token signature' } });
        }
        const user = yield prisma_1.default.users.findFirst({
            where: { id: decoded.id, deleted_at: null }
        });
        if (!user) {
            return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not found' } });
        }
        // Terbitkan Access Token baru (15 menit)
        const newToken = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, role: user.role }, env_1.config.jwtSecret || 'supersecretkey', { expiresIn: '15m' });
        return res.status(200).json({
            success: true,
            data: {
                token: newToken,
                refresh_token: refresh_token, // Kirimkan ulang yang existing, atau opsional bisa dibikin rotasi (buat refresh token baru lagi)
                expires_in: 900
            },
            message: 'Access token refreshed successfully'
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        });
    }
});
exports.refresh = refresh;
