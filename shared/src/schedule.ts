import { z } from 'zod'
import { eachDayOfInterval, format, parseISO } from 'date-fns'

export const scheduleSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않아요'),
  time: z.string().regex(/^(([01]\d|2[0-3]):(00|30)|24:00)$/, '시간은 30분 단위로만 선택할 수 있어요'), // study: FE에서는 30분 단위로 선택됨이 당연하나, 서버에서는 여러 잘못된 요청을 생각해서 의심하고 검사해야함
})

export type ScheduleSlot = z.infer<typeof scheduleSlotSchema>

export function slotKey(slot: ScheduleSlot): string {
  return `${slot.date}T${slot.time}`
} // study: 한 줄 짜리 문자열로 합쳐주는 함수.(문자열로 바꿔야 비교하기 용이)

export const submitResponseRequestSchema = z
  .object({
    availableSlots: z.array(scheduleSlotSchema).min(1, '가능한 시간을 최소 1개 선택해주세요').max(2000),
    preferredSlots: z.array(scheduleSlotSchema).max(2000),
  })
  .refine(
    (data) => {
      const availableKeys = new Set(data.availableSlots.map(slotKey)) // study: slot 들을 slotkey 문자열로 만드는 map 적용, set에 담음. O(1)에 탐색하기 위해.
      return data.preferredSlots.every((slot) => availableKeys.has(slotKey(slot))) // study: 선호 슬롯 전부를(every) 가능 슬롯이 가지고(has) 있어야 한다.
    },
    { message: '선호 시간은 가능한 시간 중에서만 선택할 수 있어요', path: ['preferredSlots'] },
  )

export type SubmitResponseRequest = z.infer<typeof submitResponseRequestSchema> // study: type 으로 만들기.

export type SubmitResponseResponse = {
  availableCount: number
  preferredCount: number
} // study: 저장(submit)할 때는, FE가 이미 정보를 알고 있으므로 저장 개수만,

export type GetResponseResponse = {
  availableSlots: ScheduleSlot[]
  preferredSlots: ScheduleSlot[]
  completedAt: string | null
} // study: 읽어올(Get) 때는, 원본대로 그리드에 그려줘야 하므로 실제 목록 필요.
// claude: completedAt은 참여자 대시보드의 "내 응답 상태"용 - 응답을 하나도 안 남겼으면 null, 남겼으면 그 행들의 created_at(전부 같은 시각 - 한 번의 PUT에서 일괄 insert됨).

function parseTimeToMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

function formatMinutesToTime(minutes: number): string {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}
// study: 날짜, 시간 범위 받아서 30분 간격의 각 슬롯을 리스트로 뽑아내는 함수. date-fns 에서 윤년 등 날짜 로직 처리하고, 30분 시간 단위 계산은 직접 for 반복문을 돈다.
export function generateSlots(dateStart: string, dateEnd: string, timeStart: string, timeEnd: string): ScheduleSlot[] {
  const start = parseISO(dateStart)
  const end = parseISO(dateEnd)
  // claude: 정상 흐름에선 약속 생성 스키마가 이미 dateStart <= dateEnd를 보장함.
  if (start > end) return []

  const startMinutes = parseTimeToMinutes(timeStart)
  const endMinutes = parseTimeToMinutes(timeEnd)

  const slots: ScheduleSlot[] = []
  for (const day of eachDayOfInterval({ start, end })) {
    const dateStr = format(day, 'yyyy-MM-dd')
    for (let minutes = startMinutes; minutes <= endMinutes; minutes += 30) {
      slots.push({ date: dateStr, time: formatMinutesToTime(minutes) })
    }
  }

  return slots
}
