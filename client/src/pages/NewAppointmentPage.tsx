import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'  // study: 입력값 검증 규칙 관련 import
import { useNavigate } from 'react-router'
import axios from 'axios'
import { addDays, format, parseISO } from 'date-fns'
import {
  createAppointmentRequestSchema,
  type CreateAppointmentRequest,
  type CreateAppointmentResponse,
} from 'shared'
import { setSession } from '../lib/session.ts'
import DateRangeField from '../components/DateRangeField.tsx'
import TimeRangeSlider from '../components/TimeRangeSlider.tsx'
import ScreenHint from '../components/ScreenHint.tsx'

function NewAppointmentPage() {
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState('')
  const [deadlineDate, setDeadlineDate] = useState('')
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateAppointmentRequest>({
    resolver: zodResolver(createAppointmentRequestSchema),
    defaultValues: { dateStart: '', dateEnd: '', timeStart: '09:00', timeEnd: '18:00', deadline: '' },
  })  
  // claude: 날짜/시간 피커(DateRangeField·TimeRangeSlider)는 register 대신 setValue로 폼 상태를 갱신하고, watch로 현재 값을 읽어와 컨트롤드 컴포넌트로 렌더링한다(피커가 한 번에 두 필드를 함께 바꾸기 때문에 register 하나로는 표현이 안 됨).
  const dateStart = watch('dateStart')
  const dateEnd = watch('dateEnd')
  const timeStart = watch('timeStart')
  const timeEnd = watch('timeEnd')

  // study: 제출 시 실행 될 함수.
  const onSubmit = async (values: CreateAppointmentRequest) => {
    setSubmitError('')
    try {
      const { data } = await axios.post<CreateAppointmentResponse>('/api/appointments', values) // study: post 요청 뒤 data(id)만 꺼냄
      setSession(data.appointmentId, { participantId: data.participantId, role: 'admin' }) // study: Browser localStorage에 약속번호, 참여자 정보 저장
      navigate(`/a/${data.appointmentId}`, { state: { justCreated: true } })
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) { // study: 에러 종류 확인. axios 에러이며 그중에서도 400(입력) 문제인지.
        const fields = err.response.data?.fields as Record<string, string> | undefined // study: BE가 보낸 err에서 field 부분 꺼내옴.
        if (fields) {
          for (const [field, message] of Object.entries(fields)) {
            setError(field as keyof CreateAppointmentRequest, { message })
          }
          return
        }
      }
      setSubmitError('약속 생성에 실패했어요. 잠시 후 다시 시도해주세요.') // study: 위 입력 에러 경우가 아니라면, 전부 이렇게 표시됨.
    }
  }

  // claude: 마감일을 "선택한 날짜의 자정(24:00)"으로 자동 설정 — 즉 다음날 00:00을 마감 시각으로 저장한다.
  const handleDeadlineDateChange = (date: string) => {
    setDeadlineDate(date)
    if (!date) {
      setValue('deadline', '')
      return
    }
    const nextDay = format(addDays(parseISO(date), 1), 'yyyy-MM-dd')
    setValue('deadline', `${nextDay}T00:00:00`)
  }
// study: submit 이벤트 발생, onSubmit 호출, 이후 handleSubmit은 true일시 onSubmit 실행
// study: label 내부는 register(필드이름) 으로 만든 객체를 ...으로 뿌려서 input 태그안에 넣어줌, error 날시 <p>태그안 메세지 출력
  return (
    <form className="page-stack transition-slide-up" onSubmit={handleSubmit(onSubmit)}>
      <label>
        약속 제목
        <input {...register('title')} placeholder="예) 팀 프로젝트 회의" />
        {errors.title && <p className="field-error">{errors.title.message}</p>}
      </label>
      <label>
        후보 날짜
        <DateRangeField
          mode="range"
          startValue={dateStart}
          endValue={dateEnd}
          onChange={(start, end) => {
            setValue('dateStart', start)
            setValue('dateEnd', end)
          }}
        />
        {errors.dateStart && <p className="field-error">{errors.dateStart.message}</p>}
        {errors.dateEnd && <p className="field-error">{errors.dateEnd.message}</p>}
      </label>
      <label>
        후보 시간대
        <TimeRangeSlider
          startValue={timeStart}
          endValue={timeEnd}
          onChange={(start, end) => {
            setValue('timeStart', start)
            setValue('timeEnd', end)
          }}
        />
        {errors.timeStart && <p className="field-error">{errors.timeStart.message}</p>}
        {errors.timeEnd && <p className="field-error">{errors.timeEnd.message}</p>}
      </label>
      <label>
        응답 마감(선택)
        <DateRangeField mode="single" value={deadlineDate} onChange={handleDeadlineDateChange} />
        {deadlineDate && <ScreenHint text={`선택한 날짜(${deadlineDate}) 자정까지 응답을 받아요.`} />}
      </label>
      <label>
        약속 전체 인원수
        <input type="number" {...register('headcount', { valueAsNumber: true })} placeholder="예) 5" />
        {errors.headcount && <p className="field-error">{errors.headcount.message}</p>}
      </label>
      <label>
        생성자 이름
        <input {...register('creatorName')} placeholder="이름 입력" />
        {errors.creatorName && <p className="field-error">{errors.creatorName.message}</p>}
      </label>
      <label>
        관리자 비밀번호
        <input type="password" {...register('adminPassword')} placeholder="숫자 4자리" />
        {errors.adminPassword && <p className="field-error">{errors.adminPassword.message}</p>}
      </label>
      <ScreenHint text="비밀번호를 잊으면 관리자로 다시 접속할 수 없어요. 꼭 기억해주세요." />
      {submitError && <p className="field-error">{submitError}</p>}
      <button type="submit" disabled={isSubmitting}>약속 만들기</button>
    </form>
  )
}

export default NewAppointmentPage
