import { PrismaClient } from '@prisma/client';
import { config } from './env'; 
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: ['error'],
    datasources: {
        db: {
            url: config.databaseUrl
        }
    }
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
prisma.$connect().catch((err) => {
    console.error('❌ Database connection error:', err.message);
});

export default prisma;
