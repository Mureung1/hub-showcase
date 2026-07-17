import type { JoinAppointmentResponse } from 'shared'
import { buildAppointmentLink } from '../lib/appointmentLink.ts'
import { useJoinAppointment } from '../lib/useJoinAppointment.ts'

type JoinAppointmentFormProps = {
  appointmentId?: string
  onSuccess: (response: JoinAppointmentResponse, appointmentId: string) => void // study:: 함수: (매개변수: 타입) => 리턴값
}

function JoinAppointmentForm({ appointmentId, onSuccess }: JoinAppointmentFormProps) {
  const { link, setLink, linkError, submitError, register, errors, isSubmitting, onSubmit } = useJoinAppointment(
    appointmentId,
    onSuccess,
  )
  const linkValue = appointmentId ? buildAppointmentLink(appointmentId) : undefined // study: 부모로부터 props로 받은 링크 관련 변수 linkValue.

  return (
    <form className="page-stack" onSubmit={onSubmit}>
      <label>
        참여 링크
        {linkValue ? (
          <input value={linkValue} disabled />
        ) : (
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="공유받은 링크를 붙여넣으세요" />
        )}
        {linkError && <p className="field-error">{linkError}</p>}
      </label>
      <label>
        이름
        <input {...register('name')} placeholder="이름을 입력하세요" />
        {errors.name && <p className="field-error">{errors.name.message}</p>}
      </label>
      <label>
        간편 비밀번호
        <input type="password" {...register('password')} placeholder="숫자 4자리" />
        {errors.password && <p className="field-error">{errors.password.message}</p>}
      </label>
      {submitError && <p className="field-error">{submitError}</p>}
      <button type="submit" disabled={isSubmitting}>
        참여하기
      </button>
    </form>
  )
}

export default JoinAppointmentForm
