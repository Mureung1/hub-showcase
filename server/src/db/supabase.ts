import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

/**
 * 서버 전용 Supabase 클라이언트.
 * service_role 키를 사용하므로 RLS를 우회한다 — 서버(server/)에서만 import 할 것.
 */

// npm workspace 스크립트는 cwd가 server/ 라서, 루트 .env를 파일 기준 경로로 명시해 로드한다.
const currentDir = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(currentDir, '../../../.env') })
config() // server/.env 가 있으면 추가로 로드 (fallback)

// SUPABASE_URL은 프로젝트 기본 URL이어야 한다. 실수로 붙은 /rest/v1/ 나 끝 슬래시는 제거.
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
export const MATCH_REQUESTS_TABLE = 'match_requests'
