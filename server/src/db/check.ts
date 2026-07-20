import { rowToSubsidy, type SubsidyRow } from './mappers.js'
import { SUBSIDIES_TABLE, supabase } from './supabase.js'

/**
 * subsidies 테이블 연결·조회 검증 (이슈 #3 완료 기준).
 * count와 첫 row를 출력하고, 정상이면 exit 0 / 실패면 exit 1.
 * 실행: npm run db:check -w @hub/server
 */
async function check(): Promise<void> {
  const { data, count, error } = await supabase
    .from(SUBSIDIES_TABLE)
    .select('*', { count: 'exact' })
    .order('id', { ascending: true })
    .limit(1)

  if (error) {
    console.error('[db:check] 조회 실패:', error.message)
    process.exit(1)
  }

  console.log(`[db:check] 연결 성공 — 총 ${count ?? 0}건`)

  const first = data?.[0]
  if (first) {
    console.log('[db:check] 첫 row:', rowToSubsidy(first as SubsidyRow))
  } else {
    console.warn('[db:check] row가 없습니다. 먼저 npm run db:seed 를 실행하세요.')
  }
}

check()
