import { z } from 'zod'

export type Role = 'admin' | 'participant'

export const joinAppointmentRequestSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해주세요'),
  password: z.string().regex(/^\d{4}$/, '숫자 4자리를 입력해주세요'),
})

export type JoinAppointmentRequest = z.infer<typeof joinAppointmentRequestSchema>

export type JoinAppointmentResponse = {
  participantId: string
  role: Role
}
