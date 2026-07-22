import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

/**
 * npm workspace 스크립트는 cwd가 crawler/ 라서, 루트 .env를 파일 기준 경로로 명시해 로드한다.
 * (server/src/db/supabase.ts와 동일한 패턴)
 */
const currentDir = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(currentDir, '../../.env') })
config() // crawler/.env 가 있으면 추가로 로드 (fallback)

const apiKey = process.env.BIZINFO_API_KEY

if (!apiKey) {
  throw new Error('BIZINFO_API_KEY가 없습니다. .env에 발급받은 인증키를 설정하세요.')
}

export const BIZINFO_API_KEY = apiKey
