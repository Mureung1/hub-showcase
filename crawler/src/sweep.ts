import { kstToday } from './kst.js'
import { SUBSIDIES_TABLE, supabase } from './supabase.js'

/**
 * DB에 저장된 `deadline` 텍스트에서 오늘 날짜 기준 dday를 다시 계산한다 (이슈 #63).
 *
 * `deadline`은 크롤링 시점에 `parseDeadline()`(mapper.ts)이 원본 API 텍스트("2026-07-20 ~
 * 2026-08-14")를 변환해 저장한 결과라 원본과 포맷이 다르다 — 성공적으로 파싱된 경우
 * "2026. 9. 30" 형태, 실패한 경우(비-날짜 텍스트 "상시 접수" 등, 또는 하이픈이 아닌 다른
 * 구분자를 쓴 원문)는 원문이 그대로 남아있다. 그래서 `parseDeadline`을 그대로 재사용할 수
 * 없고, 저장된 포맷(`YYYY. M. D`)만 다시 파싱한다 — 매칭되지 않으면(비-날짜 텍스트) 마감
 * 여부를 판단할 수 없다는 뜻이라 `null`을 반환해 정리 대상에서 제외한다.
 */
const STORED_DEADLINE_PATTERN = /^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})$/

export function recomputeDday(deadline: string, now: Date): number | null {
  const match = deadline.match(STORED_DEADLINE_PATTERN)
  if (!match) return null

  const [, year, month, day] = match
  const endDate = new Date(Number(year), Number(month) - 1, Number(day))
  const today = kstToday(now)
  return Math.round((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/** PostgREST가 .range() 없이는 최대 1000행까지만 반환하므로, 페이지 단위로 순회해 전부 가져온다 */
const PAGE_SIZE = 1000

interface DeadlineRow {
  id: string
  deadline: string
}

async function loadAllDeadlines(): Promise<DeadlineRow[]> {
  const rows: DeadlineRow[] = []
  let from = 0

  for (;;) {
    const { data, error } = await supabase
      .from(SUBSIDIES_TABLE)
      .select('id, deadline')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw new Error(`Supabase 조회 실패: ${error.message}`)
    }

    rows.push(...(data as DeadlineRow[]))
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

/**
 * 이미 저장된 공고 중 마감이 지난 것을 삭제한다 (이슈 #63).
 * 그날 새로 수집된 공고만 거르는 `processAnnouncements`의 필터와 달리, 재수집 여부와
 * 무관하게 DB에 남아있는 모든 row를 재검증한다.
 */
export async function sweepExpired(now: Date = new Date()): Promise<{ deleted: number }> {
  const rows = await loadAllDeadlines()
  const expiredIds = rows
    .map((row) => ({ id: row.id, dday: recomputeDday(row.deadline, now) }))
    .filter((row) => row.dday !== null && row.dday < 0)
    .map((row) => row.id)

  if (expiredIds.length === 0) {
    return { deleted: 0 }
  }

  const { error } = await supabase.from(SUBSIDIES_TABLE).delete().in('id', expiredIds)
  if (error) {
    throw new Error(`Supabase 삭제 실패: ${error.message}`)
  }

  return { deleted: expiredIds.length }
}
