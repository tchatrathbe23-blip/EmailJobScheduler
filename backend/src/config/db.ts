import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function connectDB(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('[Database] Connected to database successfully.');
  } catch (error: any) {
    console.error('[Database] Database connection error:', error.message);
  }
}
