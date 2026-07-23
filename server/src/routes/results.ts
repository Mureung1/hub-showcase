import { Router, type Response } from 'express'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { GetResultsResponse, ResponseStatusResponse, CloseAppointmentResponse, GetParticipantsResponse } from 'shared'
import { requireSupabase } from '../lib/supabase.js'
import { getAppointmentDetail } from '../lib/pgTime.js'
import {
  getAppointmentResponseRows,
  aggregateSlotCounts,
  countCompletedParticipants,
  getParticipantsResponseStatus,
} from '../lib/results.js'

export const resultsRouter = Router()
// study: 관리자인지 확인하는 함수.
// claude: responses.ts의 requireParticipant(존재만 확인)와 달리, 마감 API는 관리자만 호출할 수 있어야 해서 role까지 같이 확인한다.
async function requireAdminParticipant(
  db: SupabaseClient,
  res: Response,
  appointmentId: string,
  participantId: string,
): Promise<boolean> {
  const { data, error } = await db
    .from('participants')
    .select('role')
    .eq('id', participantId)
    .eq('appointment_id', appointmentId)
    .maybeSingle<{ role: string }>()

  if (error || !data) {
    res.status(404).json({ error: '참여자를 찾을 수 없어요' })
    return false
  }

  if (data.role !== 'admin') {
    res.status(403).json({ error: '관리자만 할 수 있어요' })
    return false
  }

  return true
}
// study: 슬롯별 가능/선호 인원 데이터를 주는 곳
// claude: 마감 전이면 결과를 아예 내려주지 않는다(FE 리다이렉트만으론 API 직접 호출을 못 막으므로 - 진짜 잠금은 서버가 함).
resultsRouter.get('/:id/results', async (req, res) => {
  const db = requireSupabase(res)
  if (!db) return

  const appointmentId = req.params.id

  const range = await getAppointmentDetail(db, appointmentId)
  if (!range) {
    res.status(500).json({ error: '서버 오류가 발생했어요' })
    return
  }

  if (!range.closedAt) {
    res.status(409).json({ error: '아직 마감되지 않았어요' })
    return
  }

  const rows = await getAppointmentResponseRows(db, appointmentId)
  if (rows === null) {
    res.status(500).json({ error: '서버 오류가 발생했어요' })
    return
  }

  const response: GetResultsResponse = { slots: aggregateSlotCounts(rows) }
  res.status(200).json(response)
})
// study: 관리자 대시보드의 "n명 중 m명 완료"용.
// claude: 관리자가 마감 시점을 판단하려고 보는 용도라, 마감 여부와 무관하게 항상 응답한다(위 /results와의 의도적인 차이).
resultsRouter.get('/:id/response-status', async (req, res) => {
  const db = requireSupabase(res)
  if (!db) return

  const rows = await getAppointmentResponseRows(db, req.params.id)
  if (rows === null) {
    res.status(500).json({ error: '서버 오류가 발생했어요' })
    return
  }

  const response: ResponseStatusResponse = { completedCount: countCompletedParticipants(rows) }
  res.status(200).json(response)
})

// claude: 관리자 대시보드 하단의 참여자별 응답 상태 목록용. response-status와 마찬가지로 마감 여부와 무관하게 항상 응답한다(관리자가 마감 전에도 진행 상황을 볼 수 있어야 함).
resultsRouter.get('/:id/participants', async (req, res) => {
  const db = requireSupabase(res)
  if (!db) return

  const participants = await getParticipantsResponseStatus(db, req.params.id)
  if (participants === null) {
    res.status(500).json({ error: '서버 오류가 발생했어요' })
    return
  }

  const response: GetParticipantsResponse = { participants }
  res.status(200).json(response)
})

// study: 관리자- 마감요청.
resultsRouter.put('/:id/participants/:participantId/close', async (req, res) => {
  const db = requireSupabase(res)
  if (!db) return

  const { id: appointmentId, participantId } = req.params

  if (!(await requireAdminParticipant(db, res, appointmentId, participantId))) return

  const { data: appointment, error: fetchError } = await db
    .from('appointments')
    .select('closed_at')
    .eq('id', appointmentId)
    .maybeSingle<{ closed_at: string | null }>()

  if (fetchError || !appointment) {
    res.status(500).json({ error: '서버 오류가 발생했어요' })
    return
  }

  // claude: 이미 마감돼 있으면 다시 갱신하지 않고 기존 값을 그대로 반환한다(멱등 - 마감 버튼을 두 번 눌러도 안전).
  if (appointment.closed_at) {
    const response: CloseAppointmentResponse = { closedAt: appointment.closed_at }
    res.status(200).json(response)
    return
  }

  // claude: update 직후 그 값을 다시 select해서 응답한다 - 우리가 만든 문자열(new Date().toISOString())을 그대로 돌려주면 Postgres가 실제로 저장한 형식과 달라(Z vs +00:00) 나중에 조회한 값과 문자열이 안 맞는다.
  const { data: updated, error: updateError } = await db // study: insert = 추가, update = 수정.
    .from('appointments')
    .update({ closed_at: new Date().toISOString() })
    .eq('id', appointmentId)
    .select('closed_at')
    .single<{ closed_at: string }>()

  if (updateError || !updated) {
    console.error('appointments close failed', updateError)
    res.status(500).json({ error: '서버 오류가 발생했어요' })
    return
  }

  const response: CloseAppointmentResponse = { closedAt: updated.closed_at }
  res.status(200).json(response)
})
