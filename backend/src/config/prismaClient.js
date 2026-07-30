import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../../generated/prisma/client.ts'
import { env } from './env.js'

// mariadb 드라이버는 연결 문자열의 `ssl` 파라미터만 인식하고,
// Aiven 같은 서비스가 주는 `ssl-mode=REQUIRED` 파라미터는 그대로 무시해버린다.
// 그래서 DATABASE_URL에 ssl-mode가 있으면 드라이버가 이해하는 ssl=true로 바꿔서 넘겨준다.
// 로컬 개발용 URL(ssl-mode 파라미터 없음)은 그대로 둬서 기존처럼 SSL 없이 연결된다.
function resolveDatabaseUrl(databaseUrl) {
  const url = new URL(databaseUrl)
  const sslMode = url.searchParams.get('ssl-mode')
  const sslDisabled = sslMode?.toUpperCase() === 'DISABLED'

  if (sslMode && !sslDisabled) {
    url.searchParams.delete('ssl-mode')
    url.searchParams.set('ssl', 'true')
  }

  return url.toString()
}

// Prisma 7부터는 driver adapter를 통해 DB에 연결해야 함 (mysql -> mariadb adapter 사용)
const adapter = new PrismaMariaDb(resolveDatabaseUrl(env.databaseUrl))

// Prisma Client 싱글턴 (앱 전체에서 하나만 생성해서 재사용)
export const prisma = new PrismaClient({ adapter })
