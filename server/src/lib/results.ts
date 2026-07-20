import type { SupabaseClient } from '@supabase/supabase-js'
import { slotKey, type SlotResult } from 'shared'
import { normalizeTime } from './pgTime.js'

export type ResponseRow = {
  participant_id: string
  date: string
  time: string
  is_preferred: boolean
}

// claude: responses엔 appointment_id가 없어서, participants로 대상 id를 먼저 구한 뒤 그 id로 responses를 조회하는 2단계 쿼리.
export async function getAppointmentResponseRows(db: SupabaseClient, appointmentId: string): Promise<ResponseRow[] | null> {
  // study: 우선 해당 약속에 속한 참가자들의 id만 뽑아온다.
  const { data: participants, error: participantsError } = await db
    .from('participants')
    .select('id') 
    .eq('appointment_id', appointmentId)

  if (participantsError) return null

  const participantRows = (participants ?? []) as { id: string }[]
  const participantIds = participantRows.map((row) => row.id)
  if (participantIds.length === 0) return []
  // study: id 와 일치하는 response 내용만 가져온다. 
  const { data, error } = await db
    .from('responses')
    .select('participant_id, date, time, is_preferred')
    .in('participant_id', participantIds)

  if (error) return null

  return (data ?? []) as ResponseRow[]
}

// claude: 순수 함수(DB 접근 없음) - 슬롯별 가능/선호 인원 집계. availableCount가 0인 슬롯은 애초에 등장하지 않으므로 결과에 포함되지 않는다.
export function aggregateSlotCounts(rows: ResponseRow[]): SlotResult[] {
  const counts = new Map<string, SlotResult>()

  for (const row of rows) {
    const time = normalizeTime(row.time)
    const key = slotKey({ date: row.date, time })
    const existing = counts.get(key)

    if (existing) {
      existing.availableCount += 1
      if (row.is_preferred) existing.preferredCount += 1
    } else {
      counts.set(key, { date: row.date, time, availableCount: 1, preferredCount: row.is_preferred ? 1 : 0 })
    }
  }

  return [...counts.values()]
}

// claude: 순수 함수 - 응답을 하나라도 남긴 participant_id의 distinct 개수(= 일정 입력을 완료한 인원).
// study: rows 에서 id만 빼옴 -> Set 으로 만들어서 중복 제거 -> .size로 세어서 반환.
export function countCompletedParticipants(rows: ResponseRow[]): number {
  return new Set(rows.map((row) => row.participant_id)).size
}
