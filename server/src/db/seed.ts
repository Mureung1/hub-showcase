import type { Subsidy } from '@hub/shared'
import { sampleSubsidies } from '../data/sample-subsidies.js'
import { subsidyToRow } from './mappers.js'
import { SUBSIDIES_TABLE, supabase } from './supabase.js'

/**
 * 샘플 지원금 데이터를 subsidies 테이블에 upsert 한다.
 * sample-subsidies.ts를 단일 소스로 재사용해 mock/DB 중복 정의를 피한다.
 * 실행: npm run db:seed -w @hub/server
 */
async function seed(): Promise<void> {
  const rows = (sampleSubsidies as Subsidy[]).map(subsidyToRow)

  const { data, error } = await supabase
    .from(SUBSIDIES_TABLE)
    .upsert(rows, { onConflict: 'id' })
    .select('id')

  if (error) {
    console.error('[db:seed] 실패:', error.message)
    process.exit(1)
  }

  console.log(`[db:seed] ${data?.length ?? 0}건 upsert 완료`)
}

seed()
