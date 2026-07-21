import type { JoinAppointmentResponse } from 'shared'
import { buildAppointmentLink } from '../lib/appointmentLink.ts'
import { useJoinAppointment } from '../lib/useJoinAppointment.ts'
import ScreenHint from './ScreenHint.tsx'
import './JoinAppointmentForm.css'

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
    <form className="page-stack join-appointment-form transition-slide-up" onSubmit={onSubmit}>
      <label>
        참여 링크
        {linkValue ? (
          <input value={linkValue} disabled />
        ) : (
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="공유받은 링크를 붙여넣으세요" />
        )}
        {linkError && <p className="field-error">{linkError}</p>}
      </label>
      <div className="field-with-hint">
        <label>
          이름
          <input {...register('name')} placeholder="이름을 입력하세요" />
          {errors.name && <p className="field-error">{errors.name.message}</p>}
        </label>
        <ScreenHint text="약속 내에서 중복되지 않게 작성해주세요." />
      </div>
      <div className="field-with-hint">
        <label>
          간편 비밀번호
          <input type="password" {...register('password')} placeholder="숫자 4자리" />
          {errors.password && <p className="field-error">{errors.password.message}</p>}
        </label>
        <ScreenHint text="같은 이름·비밀번호로 나중에 다시 접속해 응답을 수정할 수 있어요. 비밀번호는 꼭 기억해 주세요." />
      </div>
      <div className="form-actions">
        {submitError && <p className="field-error">{submitError}</p>}
        <button type="submit" disabled={isSubmitting}>
          참여하기
        </button>
      </div>
    </form>
  )
}

export default JoinAppointmentForm
