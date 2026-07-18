import { Router } from 'express'
import { createAppointmentRequestSchema, type CreateAppointmentResponse, type AppointmentDetailResponse } from 'shared'
import { requireSupabase } from '../lib/supabase.js'
import { hashPassword } from '../lib/password.js'
import { zodIssuesToFields } from '../lib/zodFields.js'
import { getAppointmentRange } from '../lib/pgTime.js'

// study: 데이터 흐름: req(FE에서) -> parsed -> body -> body.요소  (여기서 요소 = shared에 처음 정의 했었던 요소들.)

// study: 예약 관련 기능만 담당하는 Router 생성.
export const appointmentsRouter = Router()
// study: 상세주소는 app에서 추가됨, async = 아래에서 await 를 쓰기 위해 필수
appointmentsRouter.post('/', async (req, res) => { // study: 약속 post API.
  const parsed = createAppointmentRequestSchema.safeParse(req.body)
  // study: 실패 -> Record 로 string:string 쌍 갖는 field 만듬 -> issue 반복문으로 가져옴 -> key는 path, value는 message로 field에 추가(기존에 추가 안된 경우만) -> 응답 후 종료
  // claude: 위 study 주석이 설명하는 로직 자체는 그대로고, participants.ts와 중복돼 있던 구현을 zodIssuesToFields로 추출함
  if (!parsed.success) {
    res.status(400).json({ error: '입력값을 확인해주세요', fields: zodIssuesToFields(parsed.error.issues) })
    return
  }

  // claude: supabase null 체크도 participants.ts와 중복이라 requireSupabase로 추출. 아래 study 주석의 "supabase"는 이제 지역변수 db를 가리킴
  const db = requireSupabase(res)
  if (!db) return

  const body = parsed.data

  const { data: appointment, error: appointmentError } = await db // study: supabase에 작업 후 그 결과가 data 와 error 에 각각 담김.
    .from('appointments') // study: server/db 에 appointments 테이블 사용
    .insert({ // study: 우측 FE에서 받아온 내용을 좌측 DB 테이블 형식에 맞게 요청(이때 supabase 라이브러리가 외부 서버로 DB 저장 요청.)
      title: body.title,
      date_start: body.dateStart,
      date_end: body.dateEnd,
      time_start: body.timeStart,
      time_end: body.timeEnd,
      deadline: body.deadline || null, // study: ||가 아닌 ??를 쓰면 "" 입력시 deadline 에 담아버림 -> 형식 오류 발생. (버그 수정)
      headcount: body.headcount,
    })
    .select('id') // study: 저장 후, 해당 data의 id를 돌려받음(data에 저장)
    .single<{ id: string }>() // study: 객체 하나(single)만. 형식은 { id: string }

  if (appointmentError || !appointment) {
    console.error('appointments insert failed', appointmentError) // study: 서버에는 appointment Error을 구체적으로 보여주고, res는 간단히 보냄.(보안 상 이유)
    res.status(500).json({ error: '서버 오류가 발생했어요' })
    return
  }

  const passwordHash = await hashPassword(body.adminPassword)
  const { data: participant, error: participantError } = await db
  .from('participants')
  .insert({
    appointment_id: appointment.id,
    name: body.creatorName,
    password_hash: passwordHash,
    role: 'admin',
  })
  .select('id')
  .single<{ id: string }>()

  if (participantError || !participant) {
    console.error('participants insert failed', participantError)
    await db.from('appointments').delete().eq('id', appointment.id) // study: 참여자 등록 에러 발생 => eq(equal)인 = 방금 만든 약속 삭제
    res.status(500).json({ error: '서버 오류가 발생했어요' })
    return
  }

  // study: response 에 id 를 담아서 FE에 응답. CreateAppointmentResponse 은 shared에서 FE,BE가 공통적으로 참조함
  const response: CreateAppointmentResponse = { appointmentId: appointment.id, participantId: participant.id }
  res.status(201).json(response)
})




// study: get 요청 시 id 확인. 아래 /:id 에서 id 자리가 실제 요청 때 채워짐.
appointmentsRouter.get('/:id', async (req, res) => {
  const db = requireSupabase(res) // study: supabase 연결 확인.(lib/supabase.ts 에서 가져옴.)
  if (!db) return

  const range = await getAppointmentRange(db, req.params.id) // study: 실제 db에 요청하고 결과 반환 받는 부분.(lib/pgTime.ts 에서 가져옴.)

  if (!range) {
    res.status(404).json({ error: '약속을 찾을 수 없어요' })
    return
  }
  // study: 약속 id, 그리고 ...range = range 안에 필드 전체 = 날짜 2개, 시간 2개. 따라서 총 5개의 필드를 가진 객체.(AppointmentDetailResponse 의 type 표시로 안전망 역할. )
  const response: AppointmentDetailResponse = { appointmentId: req.params.id, ...range } 
  res.status(200).json(response)
})
