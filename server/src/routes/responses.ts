import { Router, type Response } from 'express'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  submitResponseRequestSchema,
  generateSlots,
  slotKey,
  type ScheduleSlot,
  type SubmitResponseResponse,
  type GetResponseResponse,
} from 'shared'
import { requireSupabase } from '../lib/supabase.js'
import { zodIssuesToFields } from '../lib/zodFields.js'
import { getAppointmentDetail, normalizeTime } from '../lib/pgTime.js'

// study: 투표창 관련 요청 처리 라우터.
export const responsesRouter = Router()

// claude: GET/PUT 양쪽에 똑같이 있던 "참여자 확인 후 없으면 404" 중복을 requireSupabase와 같은 패턴(확인+실패 시 응답까지 한 함수에서 처리)으로 묶음
async function requireParticipant(
  db: SupabaseClient,
  res: Response,
  appointmentId: string,
  participantId: string,
): Promise<boolean> {
  const { data, error } = await db
    .from('participants')
    .select('id')
    .eq('id', participantId)
    .eq('appointment_id', appointmentId)
    .maybeSingle<{ id: string }>()

  if (error || !data) {
    res.status(404).json({ error: '참여자를 찾을 수 없어요' })
    return false
  }
  return true
}

// study: get 요청 처리. db 상태 체크 -> 참여자 존재 체크 -> response 정보 받아오기(기존 응답 내용) -> 가능 slot 및 선호 slot 으로 각각 파싱해서 return.
responsesRouter.get('/:id/participants/:participantId/responses', async (req, res) => {
  const db = requireSupabase(res)
  if (!db) return

  const { id: appointmentId, participantId } = req.params

  if (!(await requireParticipant(db, res, appointmentId, participantId))) return

  const { data, error } = await db.from('responses').select('date, time, is_preferred').eq('participant_id', participantId)

  if (error) {
    console.error('responses select failed', error)
    res.status(500).json({ error: '서버 오류가 발생했어요' })
    return
  }

  const rows = (data ?? []) as { date: string; time: string; is_preferred: boolean }[]
  const availableSlots: ScheduleSlot[] = rows.map((row) => ({ date: row.date, time: normalizeTime(row.time) }))
  const preferredSlots: ScheduleSlot[] = rows
    .filter((row) => row.is_preferred)
    .map((row) => ({ date: row.date, time: normalizeTime(row.time) }))

  const response: GetResponseResponse = { availableSlots, preferredSlots }
  res.status(200).json(response)
})

// study: put 요청 처리. submit 형식 체크 -> db 상태 체크 -> 참여자 존재 체크 -> 입력하려는 시간이 약속 범위 안인지 체크 -> 데이터 형식 관련 정리 -> 기존 내용 delete -> 새로운 데이터 insert. -> 가능 및 선호 선택 개수 response
responsesRouter.put('/:id/participants/:participantId/responses', async (req, res) => {
  const parsed = submitResponseRequestSchema.safeParse(req.body) // study: 형식 검증. safeParse 는 실패하더라도 예외 안던지고, parsed.success 에 결과 표시 해주므로 사용함.
  if (!parsed.success) {
    res.status(400).json({ error: '입력값을 확인해주세요', fields: zodIssuesToFields(parsed.error.issues) })
    return
  }

  const db = requireSupabase(res)
  if (!db) return

  const { id: appointmentId, participantId } = req.params

  if (!(await requireParticipant(db, res, appointmentId, participantId))) return

  // study: range = 약속 시간으로 지정 가능한 범위를 의미.
  const range = await getAppointmentDetail(db, appointmentId)
  if (!range) {
    res.status(500).json({ error: '서버 오류가 발생했어요' })
    return
  }

  // claude: 마감된 약속이면 응답 제출 자체를 막는다(Day4가 남긴 "마감 후에도 수정 가능" 한계 해소).
  if (range.closedAt) {
    res.status(409).json({ error: '마감된 약속이에요' })
    return
  }
  // study: 해당 범위에 해당하는 slot을 생성하여 set 으로 가져옴.(generataeSlots 내부 로직 참고.)
  const candidateKeys = new Set(generateSlots(range.dateStart, range.dateEnd, range.timeStart, range.timeEnd).map(slotKey))

  // study: 선호 시간이 입력시간의 부분집합임은 submit 형식에서 이미 체크 완료하였으므로, 입력시간이 후보시간의 부분집합임만 확인한다.
  const { availableSlots, preferredSlots } = parsed.data
  const outOfRange = availableSlots.some((slot) => !candidateKeys.has(slotKey(slot))) // study: slot 중 하나라도 후보키(범위에 해당하는 슬롯 전부)에 없으면, OutofRange = true. 
  if (outOfRange) {
    res.status(400).json({ error: '약속 범위를 벗어난 시간이 있어요' })
    return
  }

  const preferredKeys = new Set(preferredSlots.map(slotKey)) // study: 아래 is_preferred 를 결정할 때 선호 슬롯에 포함되는지(has) 일일이 판단 해야하므로, 탐색 시간 최적화를 위해 Set 사용.
  const uniqueAvailable = new Map<string, ScheduleSlot>()
  for (const slot of availableSlots) {
    uniqueAvailable.set(slotKey(slot), slot)
  } // study: 중복 처리 + 아래 row에 date,time 넣을 때 key로 value 가져오기 위해 Map 자료형 사용.

  const rows = [...uniqueAvailable.values()].map((slot) => ({
    participant_id: participantId,
    date: slot.date,
    time: slot.time,
    is_preferred: preferredKeys.has(slotKey(slot)),
  }))

  const { error: deleteError } = await db.from('responses').delete().eq('participant_id', participantId)
  if (deleteError) {
    console.error('responses delete failed', deleteError)
    res.status(500).json({ error: '서버 오류가 발생했어요' })
    return
  }

  const { error: insertError } = await db.from('responses').insert(rows)
  if (insertError) {
    console.error('responses insert failed', insertError)
    res.status(500).json({ error: '서버 오류가 발생했어요' })
    return
  }
  // study: 이미 FE가 자세한 정보는 알고 있으므로, 몇 개 저장 성공했는지만 response. 
  const response: SubmitResponseResponse = {
    availableCount: rows.length,
    preferredCount: rows.filter((row) => row.is_preferred).length,
  }
  res.status(200).json(response)
})
