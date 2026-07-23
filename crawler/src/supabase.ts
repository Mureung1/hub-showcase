import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

/**
 * 크롤러 전용 Supabase 클라이언트. server/src/db/supabase.ts와 동일한 패턴이지만,
 * crawler는 server를 의존하지 않는 별도 워크스페이스(cron으로 독립 실행)라 각자 둔다.
 */

const currentDir = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(currentDir, '../../.env') })
config() // crawler/.env 가 있으면 추가로 로드 (fallback)

const url = process.env.SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  throw new Error(
    'Supabase 환경변수가 없습니다. .env에 SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 설정하세요.',
  )
}

export const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
})

export const SUBSIDIES_TABLE = 'subsidies'
