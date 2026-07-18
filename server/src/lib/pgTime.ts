import type { SupabaseClient } from '@supabase/supabase-js'

export function normalizeTime(pgTime: string): string {
  return pgTime.slice(0, 5)
}
// study: 원본 이름들 camelCase 로 변환해줘야 함.
export type AppointmentRange = {
  dateStart: string
  dateEnd: string
  timeStart: string
  timeEnd: string
}
// study: 원본 이름들.(snake_case)
type AppointmentRangeRow = {
  date_start: string
  date_end: string
  time_start: string
  time_end: string
}

export async function getAppointmentRange(db: SupabaseClient, appointmentId: string): Promise<AppointmentRange | null> {
  const { data, error } = await db
    .from('appointments')
    .select('date_start, date_end, time_start, time_end')
    .eq('id', appointmentId)
    .maybeSingle<AppointmentRangeRow>()

  if (error || !data) return null

  return {
    dateStart: data.date_start,
    dateEnd: data.date_end,
    timeStart: normalizeTime(data.time_start),
    timeEnd: normalizeTime(data.time_end),
  }
}
