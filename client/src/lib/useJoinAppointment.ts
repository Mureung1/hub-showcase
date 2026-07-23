import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod' // study: React Hook Form ↔ zodResolver(통역사) ↔ Zod 검사 규칙
import axios from 'axios'
import { joinAppointmentRequestSchema, type JoinAppointmentRequest, type JoinAppointmentResponse } from 'shared'
import { parseAppointmentId } from './appointmentLink.ts'

export function useJoinAppointment(
  appointmentId: string | undefined,
  onSuccess: (response: JoinAppointmentResponse, appointmentId: string) => void,
) {
  const [link, setLink] = useState('') // study: 사용자가 직접 입력한 링크 관련 변수 link.
  const [linkError, setLinkError] = useState('')
  const [submitError, setSubmitError] = useState('')

  // study: return 에서 쓰이는 도구들을 요청 스키마에 따라 가져옴. 사용자가 이름/비번을 타이핑 → register가 기억해둠 → "참여하기" 버튼 클릭 → handleSubmit이 먼저 규칙책 검사 → 틀렸으면 errors에 자동으로 메모 남기고 끝(우리 함수는 실행 안 됨) → 맞았으면 onValid 실행, 그동안 isSubmitting 신호등 켜짐 → 서버한테 요청 → 서버가 "이것도 틀렸어요"라고 하면 우리가 setError로 손수 메모 추가 → 신호등 꺼짐.
  const {
    register, // study: 내부적으로 onChange 실행, 그러나 useState + onChange 방식과 달리 글자 하나마다 리렌더링 하진 않는다.
    handleSubmit, // study: 아래 스키마에 따라 onValid 실행 전 검증하는 역할. 에러 발생 시 아래 errors 에 메세지 저장. (여기서 메세지 = zod에 객체로 내가 정의해뒀던 내용)
    setError, // study: 위와 같이 자동 검증이 아닌, 직접 호출해서 errors에 적는 방식.
    formState: { errors, isSubmitting }, // study: isSubmitting = 제출 중일 때(handleSubmit 통과해서 onValid가 실행되었을 때) true -> 제출버튼 disabled.
  } = useForm<JoinAppointmentRequest>({ resolver: zodResolver(joinAppointmentRequestSchema) })

  const onValid = async (values: JoinAppointmentRequest) => {
    setSubmitError('')
    setLinkError('')

    const targetId = appointmentId ?? parseAppointmentId(link)
    if (!targetId) {
      setLinkError('올바른 참여 링크가 아니에요') // study: 파싱 실패. 링크 형식조차 틀린 경우.
      return
    }

    try {
      const { data } = await axios.post<JoinAppointmentResponse>( // study: server에 participants.ts 라우터에 post 요청. server에서 200(기존), 201(신규) 판단.
        `/api/appointments/${targetId}/participants`,
        values,
      )
      onSuccess(data, targetId)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 400) { // study: name 및 password 형식 틀린 경우.
          const fields = err.response.data?.fields as Record<string, string> | undefined
          if (fields) {
            for (const [field, message] of Object.entries(fields)) {
              setError(field as keyof JoinAppointmentRequest, { message })
            }
            return
          }
        }
        if (err.response?.status === 401) {
          setSubmitError('비밀번호가 일치하지 않아요')
          return
        }
        if (err.response?.status === 404) {
          setLinkError('존재하지 않는 약속이에요')
          return
        }
        if (err.response?.status === 409) {
          setSubmitError('정원이 다 찼어요')
          return
        }
      }
      setSubmitError('참여에 실패했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  return {
    link,
    setLink,
    linkError,
    submitError,
    register,
    errors,
    isSubmitting,
    onSubmit: handleSubmit(onValid),
  }
}
