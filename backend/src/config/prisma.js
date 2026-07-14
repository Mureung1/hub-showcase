import { PrismaClient } from '@prisma/client';

// Prisma Client 싱글턴 — 서비스 레이어는 반드시 이 인스턴스를 import해 사용한다
const prisma = new PrismaClient();

export default prisma;
