import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/prisma';
import bcrypt from 'bcryptjs';

describe('Auth Controller', () => {
  describe('POST /api/v1/auth/login', () => {
    it('should return 422 if username or password missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin' });
      
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for invalid credentials', async () => {
      // Mock prisma.users.findFirst to return null
      (prisma.users.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'wronguser', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should login successfully with correct credentials', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        name: 'Admin User',
        role: 'admin',
        password_hash: await bcrypt.hash('password123', 10),
        deleted_at: null
      };

      (prisma.users.findFirst as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.username).toBe('admin');
    });
  });
});
