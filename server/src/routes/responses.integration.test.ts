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
    // claude: completedAt은 실제 Supabase가 찍은 타임스탬프라 정확한 값을 미리 알 수 없어서, 문자열인지만 따로 확인하고
    // 나머지 필드(availableSlots/preferredSlots)는 그대로 정확한 값으로 비교한다.
    expect(res.body.completedAt).toEqual(expect.any(String))
    expect(res.body).toMatchObject({
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

  // claude: "delete 성공 후 insert 실패 시 응답이 통째로 사라지는" 문제(코드리뷰 5번)의 회귀 테스트.
  // 라우터를 거치면 잘못된 슬롯이 범위 검사에서 400으로 먼저 걸려 저장 단계까지 가지 않으므로,
  // submit_response RPC를 직접 호출해 insert 단계에서 실패시킨다(date 캐스팅 에러).
  // 트랜잭션이 없으면 delete만 적용돼 응답이 0개가 되고, 있으면 기존 2개가 그대로 남는다.
  itIfSupabaseConfigured('저장 도중 실패하면 기존 응답이 롤백되어 그대로 남는다', async () => {
    const db = supabase
    if (!db) return

    const { appointmentId } = await createTestAppointment({
      dateStart: '2026-08-20',
      dateEnd: '2026-08-20',
      timeStart: '09:00',
      timeEnd: '10:00',
    })
    createdAppointmentIds.push(appointmentId)
    const { body: joined } = await addTestParticipant(appointmentId, '참여자A')
    const participantId = joined.participantId as string

    await submitTestResponse(
      appointmentId,
      participantId,
      [
        { date: '2026-08-20', time: '09:00' },
        { date: '2026-08-20', time: '09:30' },
      ],
      [],
    )

    const { error } = await db.rpc('submit_response', {
      p_participant_id: participantId,
      p_slots: [
        { date: '2026-08-20', time: '09:00', is_preferred: false },
        { date: 'not-a-date', time: '09:30', is_preferred: false },
      ],
    })
    expect(error).not.toBeNull()

    const res = await request(app).get(`/api/appointments/${appointmentId}/participants/${participantId}/responses`)
    expect(res.body.availableSlots).toHaveLength(2)
    expect(res.body.availableSlots).toEqual(
      expect.arrayContaining([
        { date: '2026-08-20', time: '09:00' },
        { date: '2026-08-20', time: '09:30' },
      ]),
    )
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
