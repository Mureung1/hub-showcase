import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../../generated/prisma/client.ts'
import { env } from './env.js'

// mariadb 드라이버는 연결 문자열(string)을 넘기면 ssl 옵션을 true/false 같은
// boolean으로만 해석한다. 그런데 Aiven처럼 자체 서명(self-signed) 인증서를 쓰는
// 서비스는 "암호화는 하되 인증서 체인(CA) 검증은 생략" 같은 세밀한 옵션이 필요하고,
// 이건 문자열이 아니라 mariadb의 PoolConfig 객체(ssl: { rejectUnauthorized: false })로
// 넘겨야만 적용된다. 그래서 DATABASE_URL에 ssl-mode 파라미터가 있으면(배포 환경)
// URL을 분해해서 옵션 객체로 만들고, 없으면(로컬 개발) 기존처럼 문자열 그대로 사용한다.
function resolveDatabaseConfig(databaseUrl) {
  const url = new URL(databaseUrl)
  const sslMode = url.searchParams.get('ssl-mode')
  const sslDisabled = sslMode?.toUpperCase() === 'DISABLED'

  // 로컬 개발 등 ssl-mode가 없거나 명시적으로 DISABLED인 경우: 기존처럼 문자열 그대로 사용
  if (!sslMode || sslDisabled) {
    return databaseUrl
  }

  // 배포 환경(Aiven 등): 전송 구간은 암호화하되(ssl 활성화),
  // 자체 서명 인증서라 공인 CA로 검증이 불가능하므로 rejectUnauthorized: false로
  // 인증서 체인 검증만 생략한다. (학교 프로젝트 시연 목적상 이 수준이면 충분)
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : undefined,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    ssl: { rejectUnauthorized: false },
  }
}

// Prisma 7부터는 driver adapter를 통해 DB에 연결해야 함 (mysql -> mariadb adapter 사용)
const adapter = new PrismaMariaDb(resolveDatabaseConfig(env.databaseUrl))

// Prisma Client 싱글턴 (앱 전체에서 하나만 생성해서 재사용)
export const prisma = new PrismaClient({ adapter })
