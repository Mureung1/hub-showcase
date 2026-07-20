import { describe, afterEach, it, expect } from 'vitest'
import { supabase } from '../lib/supabase.js'
import {
  addTestParticipant,
  createTestAppointment,
  submitTestResponse,
  closeTestAppointment,
  cleanupTestAppointment,
} from './integrationHelpers.js'
import request from 'supertest'
import { app } from '../app.js'

const itIfSupabaseConfigured = supabase ? it : it.skip

describe('PUT/GET .../responses (실제 Supabase 연동)', () => {
  const createdAppointmentIds: string[] = []

  afterEach(async () => {
    for (const id of createdAppointmentIds) await cleanupTestAppointment(id)
    createdAppointmentIds.length = 0
  })

  itIfSupabaseConfigured('제출한 값이 실제 DB에 저장되고 GET으로 그대로 조회된다', async () => {
    const { appointmentId } = await createTestAppointment({
      dateStart: '2026-08-20',
      dateEnd: '2026-08-20',
      timeStart: '09:00',
      timeEnd: '10:00',
    })
    createdAppointmentIds.push(appointmentId)
    const { body: joined } = await addTestParticipant(appointmentId, '참여자A')
    const participantId = joined.participantId as string

    const submit = await submitTestResponse(
      appointmentId,
      participantId,
      [
        { date: '2026-08-20', time: '09:00' },
        { date: '2026-08-20', time: '09:30' },
      ],
      [{ date: '2026-08-20', time: '09:00' }],
    )
    expect(submit.status).toBe(200)
    expect(submit.body).toEqual({ availableCount: 2, preferredCount: 1 })

    const res = await request(app).get(`/api/appointments/${appointmentId}/participants/${participantId}/responses`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      availableSlots: [
        { date: '2026-08-20', time: '09:00' },
        { date: '2026-08-20', time: '09:30' },
      ],
      preferredSlots: [{ date: '2026-08-20', time: '09:00' }],
    })
  })

  itIfSupabaseConfigured('재제출하면 기존 응답이 완전히 교체된다(delete-then-insert)', async () => {
    const { appointmentId } = await createTestAppointment({
      dateStart: '2026-08-20',
      dateEnd: '2026-08-20',
      timeStart: '09:00',
      timeEnd: '10:00',
    })
    createdAppointmentIds.push(appointmentId)
    const { body: joined } = await addTestParticipant(appointmentId, '참여자A')
    const participantId = joined.participantId as string

    await submitTestResponse(appointmentId, participantId, [{ date: '2026-08-20', time: '09:00' }], [])
    const second = await submitTestResponse(appointmentId, participantId, [{ date: '2026-08-20', time: '09:30' }], [])
    expect(second.status).toBe(200)

    const res = await request(app).get(`/api/appointments/${appointmentId}/participants/${participantId}/responses`)
    expect(res.body.availableSlots).toEqual([{ date: '2026-08-20', time: '09:30' }])
  })

  itIfSupabaseConfigured('약속 범위를 벗어난 슬롯을 제출하면 400을 반환한다', async () => {
    const { appointmentId } = await createTestAppointment({
      dateStart: '2026-08-20',
      dateEnd: '2026-08-20',
      timeStart: '09:00',
      timeEnd: '10:00',
    })
    createdAppointmentIds.push(appointmentId)
    const { body: joined } = await addTestParticipant(appointmentId, '참여자A')

    const result = await submitTestResponse(
      appointmentId,
      joined.participantId as string,
      [{ date: '2026-08-20', time: '11:00' }],
      [],
    )
    expect(result.status).toBe(400)
  })

  itIfSupabaseConfigured('마감된 약속에 제출하면 409를 반환한다', async () => {
    const { appointmentId, adminId } = await createTestAppointment({
      dateStart: '2026-08-20',
      dateEnd: '2026-08-20',
      timeStart: '09:00',
      timeEnd: '10:00',
    })
    createdAppointmentIds.push(appointmentId)
    const { body: joined } = await addTestParticipant(appointmentId, '참여자A')

    const closed = await closeTestAppointment(appointmentId, adminId)
    expect(closed.status).toBe(200)

    const result = await submitTestResponse(
      appointmentId,
      joined.participantId as string,
      [{ date: '2026-08-20', time: '09:00' }],
      [],
    )
    expect(result.status).toBe(409)
  })
})
