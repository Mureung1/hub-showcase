import { describe, it, expect, afterEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { supabase } from '../lib/supabase.js'

type AppointmentRow = {
  id: string
  title: string
  date_start: string
  date_end: string
  time_start: string
  time_end: string
  deadline: string | null
  headcount: number
}

type ParticipantRow = {
  id: string
  appointment_id: string
  name: string
  password_hash: string
  role: 'admin' | 'participant'
}

const validBody = {
  title: '통합 테스트 약속',
  dateStart: '2026-07-20',
  dateEnd: '2026-07-21',
  timeStart: '09:00',
  timeEnd: '18:00',
  headcount: 3,
  creatorName: '통합테스트유저',
  adminPassword: '1234',
}

const itIfSupabaseConfigured = supabase ? it : it.skip

describe('POST /api/appointments (실제 Supabase 연동)', () => {
  const createdAppointmentIds: string[] = []

  afterEach(async () => {
    if (!supabase) return
    for (const id of createdAppointmentIds) {
      await supabase.from('appointments').delete().eq('id', id)
    }
    createdAppointmentIds.length = 0
  })

  itIfSupabaseConfigured('실제 DB에 appointments/participants row를 생성한다', async () => {
    if (!supabase) throw new Error('unreachable: itIfSupabaseConfigured guards this')

    const res = await request(app).post('/api/appointments').send(validBody)

    expect(res.status).toBe(201)
    expect(typeof res.body.appointmentId).toBe('string')

    const appointmentId: string = res.body.appointmentId
    createdAppointmentIds.push(appointmentId)

    const { data: appointment } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single<AppointmentRow>()

    expect(appointment).toMatchObject({
      title: validBody.title,
      date_start: validBody.dateStart,
      date_end: validBody.dateEnd,
      // Postgres time 컬럼은 초 단위까지 붙여서 "HH:mm:ss" 형식으로 돌려준다
      time_start: `${validBody.timeStart}:00`,
      time_end: `${validBody.timeEnd}:00`,
      headcount: validBody.headcount,
    })

    const { data: participant } = await supabase
      .from('participants')
      .select('*')
      .eq('appointment_id', appointmentId)
      .single<ParticipantRow>()

    expect(participant).toMatchObject({
      name: validBody.creatorName,
      role: 'admin',
    })
    expect(participant?.password_hash).not.toBe(validBody.adminPassword)
  })
})

describe('GET /api/appointments/:id (실제 Supabase 연동)', () => {
  const createdAppointmentIds: string[] = []

  afterEach(async () => {
    if (!supabase) return
    for (const id of createdAppointmentIds) {
      await supabase.from('appointments').delete().eq('id', id)
    }
    createdAppointmentIds.length = 0
  })

  itIfSupabaseConfigured('존재하는 약속이면 200을 반환한다', async () => {
    const created = await request(app).post('/api/appointments').send(validBody)
    const appointmentId: string = created.body.appointmentId
    createdAppointmentIds.push(appointmentId)

    const res = await request(app).get(`/api/appointments/${appointmentId}`)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ appointmentId })
  })

  itIfSupabaseConfigured('존재하지 않는 약속이면 404를 반환한다', async () => {
    const res = await request(app).get('/api/appointments/00000000-0000-0000-0000-000000000000')

    expect(res.status).toBe(404)
  })
})
