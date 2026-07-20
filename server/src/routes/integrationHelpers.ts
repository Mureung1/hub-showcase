import request from 'supertest'
import { app } from '../app.js'
import { supabase } from '../lib/supabase.js'

// claude: 여러 *.integration.test.ts 파일이 공통으로 필요로 하는 "실제 Supabase에 테스트용 약속/참여자를 만들고 지우는" 절차를 여기 모아둠.
export type CreateAppointmentOptions = {
  headcount?: number
  dateStart?: string
  dateEnd?: string
  timeStart?: string
  timeEnd?: string
}

export async function createTestAppointment(options: CreateAppointmentOptions = {}) {
  const res = await request(app)
    .post('/api/appointments')
    .send({
      title: '통합 테스트 약속',
      dateStart: options.dateStart ?? '2026-08-20',
      dateEnd: options.dateEnd ?? '2026-08-20',
      timeStart: options.timeStart ?? '09:00',
      timeEnd: options.timeEnd ?? '10:30',
      headcount: options.headcount ?? 3,
      creatorName: '통합테스트관리자',
      adminPassword: '1234',
    })

  return { appointmentId: res.body.appointmentId as string, adminId: res.body.participantId as string }
}

export async function addTestParticipant(appointmentId: string, name: string, password = '1234') {
  const res = await request(app).post(`/api/appointments/${appointmentId}/participants`).send({ name, password })
  return { status: res.status, body: res.body as { participantId?: string; role?: string; error?: string } }
}

export async function submitTestResponse(
  appointmentId: string,
  participantId: string,
  availableSlots: { date: string; time: string }[],
  preferredSlots: { date: string; time: string }[] = [],
) {
  const res = await request(app)
    .put(`/api/appointments/${appointmentId}/participants/${participantId}/responses`)
    .send({ availableSlots, preferredSlots })
  return { status: res.status, body: res.body }
}

export async function closeTestAppointment(appointmentId: string, participantId: string) {
  const res = await request(app).put(`/api/appointments/${appointmentId}/participants/${participantId}/close`)
  return { status: res.status, body: res.body as { closedAt?: string; error?: string } }
}

// claude: appointments -> participants -> responses가 전부 on delete cascade라, 약속 row 하나만 지우면 연관 데이터가 다 같이 지워짐.
export async function cleanupTestAppointment(appointmentId: string) {
  if (!supabase) return
  await supabase.from('appointments').delete().eq('id', appointmentId)
}
