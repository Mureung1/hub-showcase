import type { SupabaseClient } from '@supabase/supabase-js'
import type { SlotResult, ParticipantResponseStatus } from 'shared'
import { normalizeTime } from './pgTime.js'

// claude: 슬롯별 가능/선호 인원 집계를 DB(get_slot_counts RPC)에 위임한다.
// 예전엔 responses 전체를 끌어와 JS로 셌지만, PostgREST 기본 1000행 제한에 조용히 잘려
// 집계가 틀어질 수 있어(참여자 1명이 넓은 범위를 다 선택해도 최대 1488행) SQL의 group by로 옮겼다.
// 함수가 jsonb 배열 하나를 돌려주므로(행 여러 개가 아님) RPC 응답의 1000행 제한과도 무관하다.
// 삭제된 예전 구현은 docs/rules/codeReview/past-notes.md 참고.
export async function getSlotCounts(db: SupabaseClient, appointmentId: string): Promise<SlotResult[] | null> {
  const { data, error } = await db.rpc('get_slot_counts', { p_appointment_id: appointmentId })
  if (error) return null

  const rows = (data ?? []) as SlotResult[]
  // Postgres time은 "09:00"이 "09:00:00"으로 직렬화되므로 정규화한다(CLAUDE.md 규칙).
  return rows.map((row) => ({ ...row, time: normalizeTime(row.time) }))
}

// claude: 응답을 하나라도 남긴 참여자 수를 DB의 count(distinct)로 센다(get_completed_count RPC).
export async function getCompletedCount(db: SupabaseClient, appointmentId: string): Promise<number | null> {
  const { data, error } = await db.rpc('get_completed_count', { p_appointment_id: appointmentId })
  if (error) return null

  return (data ?? 0) as number
}

// claude: 관리자 대시보드 하단 "참여자별 응답 상태" 목록을 DB(get_participants_status RPC)에서 만들어 받는다.
export async function getParticipantsResponseStatus(
  db: SupabaseClient,
  appointmentId: string,
): Promise<ParticipantResponseStatus[] | null> {
  const { data, error } = await db.rpc('get_participants_status', { p_appointment_id: appointmentId })
  if (error) return null

  return (data ?? []) as ParticipantResponseStatus[]
}
