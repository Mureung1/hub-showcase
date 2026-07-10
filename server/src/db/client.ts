import { PrismaClient } from "@prisma/client";

// 서버리스 환경(Vercel)에서 요청마다 새 PrismaClient를 만들면 커넥션이 금방 고갈된다.
// 모듈이 재사용되는 동안(같은 함수 인스턴스, 또는 dev 서버의 HMR) 하나만 만들어 재사용한다.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
