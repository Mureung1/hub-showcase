import { Router } from 'express'
import { joinAppointmentRequestSchema, type JoinAppointmentResponse } from 'shared'
import { requireSupabase } from '../lib/supabase.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { zodIssuesToFields } from '../lib/zodFields.js'

// study: 라우터 생성
export const participantsRouter = Router()

// study: post 요청. 우선 FE에서 보낸 req, 즉 입력관련 에러처리.
participantsRouter.post('/:id/participants', async (req, res) => {
  const parsed = joinAppointmentRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '입력값을 확인해주세요', fields: zodIssuesToFields(parsed.error.issues) })
    return
  }
  // study: DB 관련 에러처리.
  const db = requireSupabase(res)
  if (!db) return
  // study: 약속 존재 여부 관련 로직.
  const appointmentId = req.params.id

  const { data: appointment, error: appointmentError } = await db
    .from('appointments')
    .select('id')
    .eq('id', appointmentId)
    .maybeSingle<{ id: string }>()

  if (appointmentError || !appointment) {
    res.status(404).json({ error: '약속을 찾을 수 없어요' })
    return
  }
  // study: 기존 참여자 확인 로직.
  const { name } = parsed.data

  const { data: existingParticipant, error: participantError } = await db
    .from('participants')
    .select('id, password_hash, role')
    .eq('appointment_id', appointmentId)
    .eq('name', name)
    .maybeSingle<{ id: string; password_hash: string; role: 'admin' | 'participant' }>()

  if (participantError) {
    console.error('participant lookup failed', participantError)
    res.status(500).json({ error: '서버 오류가 발생했어요' })
    return
  }
  // study: 기존 참여자라면, 비밀번호 비교 후 일치 시 response.
  if (existingParticipant) {
    const passwordMatches = await verifyPassword(parsed.data.password, existingParticipant.password_hash)
    if (!passwordMatches) {
      res.status(401).json({ error: '비밀번호가 일치하지 않아요' })
      return
    }

    const response: JoinAppointmentResponse = {
      participantId: existingParticipant.id,
      role: existingParticipant.role,
    }
    res.status(200).json(response)
    return
  }
  // study: 신규 참여자라면(위에서 return 되지 않았음) 새로 할당 후 response.
  const passwordHash = await hashPassword(parsed.data.password)

  const { data: created, error: createError } = await db
    .from('participants')
    .insert({
      appointment_id: appointmentId,
      name,
      password_hash: passwordHash,
      role: 'participant',
    })
    .select('id')
    .single<{ id: string }>()

  if (createError || !created) {
    console.error('participant insert failed', createError)
    res.status(500).json({ error: '서버 오류가 발생했어요' })
    return
  }

  const response: JoinAppointmentResponse = {
    participantId: created.id,
    role: 'participant',
  }
  res.status(201).json(response)
})
