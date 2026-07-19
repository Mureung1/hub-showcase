import { describe, afterEach, it, expect } from 'vitest'
import { supabase } from '../lib/supabase.js'
import { addTestParticipant, createTestAppointment, cleanupTestAppointment } from './integrationHelpers.js'

const itIfSupabaseConfigured = supabase ? it : it.skip

describe('POST /api/appointments/:id/participants (실제 Supabase 연동)', () => {
  const createdAppointmentIds: string[] = []

  afterEach(async () => {
    for (const id of createdAppointmentIds) await cleanupTestAppointment(id)
    createdAppointmentIds.length = 0
  })

  itIfSupabaseConfigured('정원(headcount)만큼 채우면 다음 신규 참여자는 409를 받는다', async () => {
    // claude: headcount=2 -> 관리자(1명) + 신규 참여자 1명까지만 허용, 그다음이 정원 초과.
    const { appointmentId } = await createTestAppointment({ headcount: 2 })
    createdAppointmentIds.push(appointmentId)

    const first = await addTestParticipant(appointmentId, '참여자A')
    expect(first.status).toBe(201)

    const second = await addTestParticipant(appointmentId, '참여자B')
    expect(second.status).toBe(409)
  })

  itIfSupabaseConfigured('정원이 찬 상태에서도 기존 참여자 재접속은 통과한다', async () => {
    const { appointmentId } = await createTestAppointment({ headcount: 2 })
    createdAppointmentIds.push(appointmentId)

    const joined = await addTestParticipant(appointmentId, '참여자A', '1111')
    expect(joined.status).toBe(201)

    const blocked = await addTestParticipant(appointmentId, '참여자B')
    expect(blocked.status).toBe(409)

    const reconnect = await addTestParticipant(appointmentId, '참여자A', '1111')
    expect(reconnect.status).toBe(200)
    expect(reconnect.body.participantId).toBe(joined.body.participantId)
  })

  itIfSupabaseConfigured('실제 DB의 participants 행 수 기준으로 정원을 센다(관리자 포함)', async () => {
    const { appointmentId } = await createTestAppointment({ headcount: 3 })
    createdAppointmentIds.push(appointmentId)

    if (!supabase) throw new Error('unreachable: itIfSupabaseConfigured guards this')
    const { count } = await supabase
      .from('participants')
      .select('id', { count: 'exact', head: true })
      .eq('appointment_id', appointmentId)
    expect(count).toBe(1) // 관리자 1명

    await addTestParticipant(appointmentId, '참여자A')
    const { count: countAfter } = await supabase
      .from('participants')
      .select('id', { count: 'exact', head: true })
      .eq('appointment_id', appointmentId)
    expect(countAfter).toBe(2)
  })
})
