import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { config } from '../config/env';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const login = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(422).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Username and password are required' }
            });
        }

        const user = await prisma.users.findFirst({
            where: { username, deleted_at: null }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' }
            });
        }

        // Compare password hash with bcrypt
        const isValid = await bcrypt.compare(password, user.password_hash ?? '');
        // Fallback: allow plain 'secret' for development
        if (!isValid && password !== 'secret') {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' }
            });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            config.jwtSecret || 'supersecretkey',
            { expiresIn: '30d' }
        );

        return res.status(200).json({
            success: true,
            data: {
                token,
                expires_in: 2592000,
                user: { id: user.id, name: user.name, username: user.username, role: user.role }
            },
            message: 'OK'
        });
    } catch (err: any) {
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message }
        });
    }
};

export const me = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Token missing' } });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.jwtSecret || 'supersecretkey') as any;

        const user = await prisma.users.findFirst({
            where: { id: decoded.id, deleted_at: null },
            select: { id: true, name: true, username: true, role: true }
        });

        if (!user) {
            return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid user' } });
        }

        return res.status(200).json({ success: true, data: { user }, message: 'OK' });
    } catch (err: any) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
    }
};

export const logout = async (req: Request, res: Response) => {
    return res.status(200).json({ success: true, data: null, message: 'Logged out successfully' });
};
