import { PrismaClient } from '@prisma/client';

// Singleton pattern — cegah Prisma buat banyak koneksi saat hot reload di dev
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: ['error'],
    datasources: {
        db: {
            // Optimalkan connection pool: connection_limit kecil untuk Supabase free tier
            // connect_timeout tinggi untuk kompensasi latency ke Tokyo
            url: process.env.DATABASE_URL
        }
    }
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

// Pre-warm koneksi database saat startup agar request pertama tidak lambat
prisma.$connect().catch((err) => {
    console.error('❌ Database connection error:', err.message);
});

export default prisma;
