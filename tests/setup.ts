import dotenv from 'dotenv';
import prisma from '../src/config/prisma';

dotenv.config({ path: '.env.test' });

// Mock Prisma
jest.mock('../src/config/prisma', () => ({
  __esModule: true,
  default: {
    users: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

beforeAll(async () => {
  // Setup logic if needed
});

afterAll(async () => {
  await prisma.$disconnect();
});
