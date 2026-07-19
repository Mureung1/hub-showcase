import type { SupabaseClient } from '@supabase/supabase-js'

export function normalizeTime(pgTime: string): string {
  return pgTime.slice(0, 5)
}
// study: 원본 이름들 camelCase 로 변환해줘야 함.
export type AppointmentDetail = {
  title: string
  dateStart: string
  dateEnd: string
  timeStart: string
  timeEnd: string
  headcount: number
  closedAt: string | null
}
// study: 원본 이름들.(snake_case)
type AppointmentDetailRow = {
  title: string
  date_start: string
  date_end: string
  time_start: string
  time_end: string
  headcount: number
  closed_at: string | null
}

// claude: 조회 목적별로 쿼리를 나누면 중복이 생겨서, 하나로 합치고 안 쓰는 필드는 각 호출부가 무시하게 함.
export async function getAppointmentDetail(db: SupabaseClient, appointmentId: string): Promise<AppointmentDetail | null> {
  const { data, error } = await db
    .from('appointments')
    .select('title, date_start, date_end, time_start, time_end, headcount, closed_at')
    .eq('id', appointmentId)
    .maybeSingle<AppointmentDetailRow>()

  if (error || !data) return null

  return {
    title: data.title,
    dateStart: data.date_start,
    dateEnd: data.date_end,
    timeStart: normalizeTime(data.time_start),
    timeEnd: normalizeTime(data.time_end),
    headcount: data.headcount,
    closedAt: data.closed_at,
  }
}
