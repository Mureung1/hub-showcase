import { describe, afterEach, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { supabase } from '../lib/supabase.js'
import {
  addTestParticipant,
  createTestAppointment,
  submitTestResponse,
  closeTestAppointment,
  cleanupTestAppointment,
} from './integrationHelpers.js'

const itIfSupabaseConfigured = supabase ? it : it.skip

describe('/results, /response-status, /close (실제 Supabase 연동)', () => {
  const createdAppointmentIds: string[] = []

  afterEach(async () => {
    for (const id of createdAppointmentIds) await cleanupTestAppointment(id)
    createdAppointmentIds.length = 0
  })

  itIfSupabaseConfigured('마감 전이면 /results는 409, /response-status는 항상 응답한다', async () => {
    const { appointmentId } = await createTestAppointment()
    createdAppointmentIds.push(appointmentId)

    const results = await request(app).get(`/api/appointments/${appointmentId}/results`)
    expect(results.status).toBe(409)

    const status = await request(app).get(`/api/appointments/${appointmentId}/response-status`)
    expect(status.status).toBe(200)
    expect(status.body).toEqual({ completedCount: 0 })
  })

  itIfSupabaseConfigured('여러 참여자의 겹치는 응답이 마감 후 /results에 정확히 집계된다', async () => {
    const { appointmentId, adminId } = await createTestAppointment({
      dateStart: '2026-08-21',
      dateEnd: '2026-08-21',
      timeStart: '09:00',
      timeEnd: '10:00',
    })
    createdAppointmentIds.push(appointmentId)

    const { body: a } = await addTestParticipant(appointmentId, '참여자A')
    const { body: b } = await addTestParticipant(appointmentId, '참여자B')

    await submitTestResponse(
      appointmentId,
      a.participantId as string,
      [
        { date: '2026-08-21', time: '09:00' },
        { date: '2026-08-21', time: '09:30' },
      ],
      [{ date: '2026-08-21', time: '09:00' }],
    )
    await submitTestResponse(appointmentId, b.participantId as string, [{ date: '2026-08-21', time: '09:00' }], [])

    const status = await request(app).get(`/api/appointments/${appointmentId}/response-status`)
    expect(status.body).toEqual({ completedCount: 2 })

    const closed = await closeTestAppointment(appointmentId, adminId)
    expect(closed.status).toBe(200)

    const results = await request(app).get(`/api/appointments/${appointmentId}/results`)
    expect(results.status).toBe(200)
    expect(results.body.slots).toEqual(
      expect.arrayContaining([
        { date: '2026-08-21', time: '09:00', availableCount: 2, preferredCount: 1 },
        { date: '2026-08-21', time: '09:30', availableCount: 1, preferredCount: 0 },
      ]),
    )
  })

  itIfSupabaseConfigured('관리자만 마감할 수 있고, 재호출해도 같은 closedAt을 멱등하게 반환한다', async () => {
    const { appointmentId, adminId } = await createTestAppointment()
    createdAppointmentIds.push(appointmentId)
    const { body: participant } = await addTestParticipant(appointmentId, '참여자A')

    const deniedForParticipant = await closeTestAppointment(appointmentId, participant.participantId as string)
    expect(deniedForParticipant.status).toBe(403)

    const first = await closeTestAppointment(appointmentId, adminId)
    expect(first.status).toBe(200)
    expect(typeof first.body.closedAt).toBe('string')

    const second = await closeTestAppointment(appointmentId, adminId)
    expect(second.status).toBe(200)
    expect(second.body.closedAt).toBe(first.body.closedAt)

    if (!supabase) throw new Error('unreachable: itIfSupabaseConfigured guards this')
    const { data: row } = await supabase
      .from('appointments')
      .select('closed_at')
      .eq('id', appointmentId)
      .single<{ closed_at: string }>()
    // claude: DB에 실제 저장된 값과 API가 돌려준 값의 형식이 정확히 일치하는지까지 확인(이전에 Z vs +00:00 형식 불일치 버그가 있었던 부분).
    expect(row?.closed_at).toBe(first.body.closedAt)
  })
})
