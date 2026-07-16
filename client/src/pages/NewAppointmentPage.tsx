import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'  // study: 입력값 검증 규칙 관련 import
import { useNavigate } from 'react-router'
import axios from 'axios'
import {
  createAppointmentRequestSchema,
  type CreateAppointmentRequest,
  type CreateAppointmentResponse,
} from 'shared'
import { setSession } from '../lib/session.ts'

function NewAppointmentPage() {
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState('')
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateAppointmentRequest>({ resolver: zodResolver(createAppointmentRequestSchema) })   // study: 해당 규칙으로 검증 및 3가지 요소 구조분해 할당

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
// study: submit 이벤트 발생, onSubmit 호출, 이후 handleSubmit은 true일시 onSubmit 실행
// study: label 내부는 register(필드이름) 으로 만든 객체를 ...으로 뿌려서 input 태그안에 넣어줌, error 날시 <p>태그안 메세지 출력
  return (
    <form className="page-stack" onSubmit={handleSubmit(onSubmit)}>
      <label>
        약속 제목
        <input {...register('title')} placeholder="예) 팀 프로젝트 회의" />
        {errors.title && <p className="field-error">{errors.title.message}</p>}
      </label>
      <label>
        후보 날짜 (시작)
        <input type="date" {...register('dateStart')} />
        {errors.dateStart && <p className="field-error">{errors.dateStart.message}</p>}
      </label>
      <label>
        후보 날짜 (종료)
        <input type="date" {...register('dateEnd')} />
        {errors.dateEnd && <p className="field-error">{errors.dateEnd.message}</p>}
      </label>
      <label>
        만남 가능 시간대 (시작)
        <input type="time" {...register('timeStart')} />
        {errors.timeStart && <p className="field-error">{errors.timeStart.message}</p>}
      </label>
      <label>
        만남 가능 시간대 (종료)
        <input type="time" {...register('timeEnd')} />
        {errors.timeEnd && <p className="field-error">{errors.timeEnd.message}</p>}
      </label>
      <label>
        응답 마감(선택)
        <input {...register('deadline')} placeholder="연도-월-일 --:--" />
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
      {submitError && <p className="field-error">{submitError}</p>}
      <button type="submit" disabled={isSubmitting}>약속 만들기</button>
    </form>
  )
}

export default NewAppointmentPage
