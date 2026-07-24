import type { Subsidy } from '@hub/shared'
import { sampleSubsidies } from '../data/sample-subsidies.js'
import { subsidyToRow } from './mappers.js'
import { SUBSIDIES_TABLE, supabase } from './supabase.js'

/**
 * 샘플 지원금 데이터를 subsidies 테이블에 upsert 한다.
 * sample-subsidies.ts를 단일 소스로 재사용해 mock/DB 중복 정의를 피한다.
 * 실행: npm run db:seed -w @hub/server
 *
 * ⚠️ 2026-07-23부로 이 8건은 실사용 Supabase 테이블에서 의도적으로 삭제된 상태다(이슈
 * #43/#44 검증 후 실크롤링 데이터만 노출하기로 결정, docs/week3_plan.md 리스크 표 참고).
 * 로컬에서 처음부터 Supabase를 세팅할 때(빈 테이블에 FE-BE-DB 슬라이스 확인용)만 실행하고,
 * 현재 운영 중인 공유 Supabase 프로젝트에는 다시 실행하지 말 것 — 실행하면 샘플 8건이
 * 실데이터 리스트에 다시 섞여 나온다.
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
  console.warn(
    '[db:seed] ⚠️ 현재 운영 중인 공유 Supabase 프로젝트라면 이 실행으로 샘플 데이터가 실데이터 리스트에 다시 섞입니다 (docs/week3_plan.md 리스크 표 참고).',
  )
}

seed()
