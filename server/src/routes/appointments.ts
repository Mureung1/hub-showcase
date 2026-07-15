import { Router } from 'express'
import { createAppointmentRequestSchema, type CreateAppointmentResponse } from 'shared'
import { supabase } from '../lib/supabase.js'
import { hashPassword } from '../lib/password.js'

// study: 데이터 흐름: req(FE에서) -> parsed -> body -> body.요소  (여기서 요소 = shared에 처음 정의 했었던 요소들.)

// study: 예약 관련 기능만 담당하는 Router 생성.
export const appointmentsRouter = Router()
// study: 상세주소는 app에서 추가됨, async = 아래에서 await 를 쓰기 위해 필수
appointmentsRouter.post('/', async (req, res) => { // study: 약속 post API.
  const parsed = createAppointmentRequestSchema.safeParse(req.body) 
  // study: 실패 -> Record 로 string:string 쌍 갖는 field 만듬 -> issue 반복문으로 가져옴 -> key는 path, value는 message로 field에 추가(기존에 추가 안된 경우만) -> 응답 후 종료
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !(key in fields)) {
        fields[key] = issue.message
      }
    }
    res.status(400).json({ error: '입력값을 확인해주세요', fields })
    return
  }

  if (!supabase) {
    console.error('Supabase client is not configured')
    res.status(500).json({ error: '서버 오류가 발생했어요' })
    return
  }
  
  const body = parsed.data

  const { data: appointment, error: appointmentError } = await supabase // study: supabase에 작업 후 그 결과가 data 와 error 에 각각 담김.
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
  // study: 위와 달리 data 를 안받는 이유 = error 인지 확인만 하면 되기 때문.
  const { error: participantError } = await supabase
  .from('participants')
  .insert({
    appointment_id: appointment.id,
    name: body.creatorName,
    password_hash: passwordHash,
    role: 'admin',
  })

  if (participantError) {
    console.error('participants insert failed', participantError) 
    await supabase.from('appointments').delete().eq('id', appointment.id) // study: 참여자 등록 에러 발생 => eq(equal)인 = 방금 만든 약속 삭제
    res.status(500).json({ error: '서버 오류가 발생했어요' })
    return
  }

  // study: response 에 id 를 담아서 FE에 응답. CreateAppointmentResponse 은 shared에서 FE,BE가 공통적으로 참조함
  const response: CreateAppointmentResponse = { appointmentId: appointment.id }
  res.status(201).json(response)
})




// study: 입장(Get)요청 시 id 확인. 아래 /:id 에서 id 자리가 실제 요청 때 채워짐.
appointmentsRouter.get('/:id', async (req, res) => {
  if (!supabase) {
    console.error('Supabase client is not configured')
    res.status(500).json({ error: '서버 오류가 발생했어요' })
    return
  }

  const { data, error } = await supabase
    .from('appointments')
    .select('id') // study: id만 꺼내올건데, (아직 꺼내온게 아님, 명령 실행 되는게 아니라 명령어 조립 되는 중)
    .eq('id', req.params.id) // study: 그중에 req에서 말한 id랑 같은 것만 꺼내와줘.
    .maybeSingle<{ id: string }>() // study: maybeSingle, 즉 찾지 못해도 error 가 아니다.

  if (error || !data) { // study: 찾지 못했으면 !data, 실제 error 라면 error 로 if 문 실행됨.
    res.status(404).json({ error: '약속을 찾을 수 없어요' })
    return
  }

  const response: CreateAppointmentResponse = { appointmentId: data.id }
  res.status(200).json(response)
})
