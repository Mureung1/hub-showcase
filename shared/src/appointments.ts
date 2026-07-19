import { z } from 'zod'
import { differenceInCalendarDays, parseISO } from 'date-fns'

export const createAppointmentRequestSchema = z
  .object({
    title: z.string().min(1, '약속 제목을 입력해주세요'),
    dateStart: z.string().min(1, '시작 날짜를 선택해주세요'),
    dateEnd: z.string().min(1, '종료 날짜를 선택해주세요'),
    timeStart: z.string().min(1, '시작 시간을 선택해주세요'),
    timeEnd: z.string().min(1, '종료 시간을 선택해주세요'),
    deadline: z.string().optional(),
    headcount: z.number().int().positive('전체 인원수는 1명 이상이어야 해요'),
    creatorName: z.string().min(1, '이름을 입력해주세요'),
    adminPassword: z.string().regex(/^\d{4}$/, '숫자 4자리를 입력해주세요'),
  })
  .refine((data) => data.dateStart <= data.dateEnd, {
    message: '종료 날짜는 시작 날짜 이후여야 해요',
    path: ['dateEnd'],
  })
  .refine((data) => differenceInCalendarDays(parseISO(data.dateEnd), parseISO(data.dateStart)) <= 30, {
    message: '날짜 범위는 최대 31일까지 선택할 수 있어요',
    path: ['dateEnd'],
  })
  .refine((data) => data.timeStart < data.timeEnd, {
    message: '종료 시간은 시작 시간 이후여야 해요',
    path: ['timeEnd'],
  })

export type CreateAppointmentRequest = z.infer<typeof createAppointmentRequestSchema>

export type CreateAppointmentResponse = {
  appointmentId: string
  participantId: string
}

export type AppointmentDetailResponse = {
  appointmentId: string
  title: string
  dateStart: string
  dateEnd: string
  timeStart: string
  timeEnd: string
  headcount: number
  closedAt: string | null
}

export type CloseAppointmentResponse = {
  closedAt: string
}
