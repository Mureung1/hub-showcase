import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../../generated/prisma/client.ts'
import { env } from './env.js'

// Prisma 7부터는 driver adapter를 통해 DB에 연결해야 함 (mysql -> mariadb adapter 사용)
const adapter = new PrismaMariaDb(env.databaseUrl)

// Prisma Client 싱글턴 (앱 전체에서 하나만 생성해서 재사용)
export const prisma = new PrismaClient({ adapter })
