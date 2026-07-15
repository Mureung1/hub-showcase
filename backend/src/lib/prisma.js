// Prisma Client 싱글턴.
// Prisma 7부터는 런타임 연결에 driver adapter(@prisma/adapter-pg)가 필요하다.
// DATABASE_URL(Supabase pooler, 6543)로 연결하고,
// 마이그레이션 전용 직결 연결(DIRECT_URL)은 prisma.config.ts에서 따로 관리한다.
//
// `--watch`로 서버가 재시작될 때마다 새 PrismaClient가 생기지 않도록
// 모듈 스코프에서 한 번만 생성해 export한다.
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.ts'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

export const prisma = new PrismaClient({ adapter })
