import type { RefObject } from 'react'
import {
  catAssistantAssets,
  emailDraftFieldMaxLengths,
  type EmailDraftInput,
  type EmailSituationId,
} from '../../entities/message'
import { AssistantPrompt } from '../guided-chat'

type EmailDetailsFormProps = {
  emailDraftInput: EmailDraftInput
  emailSituationId: EmailSituationId
  headingRef: RefObject<HTMLHeadingElement | null>
  onBack: () => void
  onChange: (field: keyof EmailDraftInput, value: string) => void
  onClear: () => void
  onGenerate: () => void
}

const commonRequiredFields: (keyof Pick<
  EmailDraftInput,
  'recipientName' | 'department' | 'studentId' | 'studentName' | 'details'
>)[] = ['recipientName', 'department', 'studentId', 'studentName', 'details']

const missingGuideFor = (emailSituationId: EmailSituationId, emailDraftInput: EmailDraftInput): string | null => {
  const fieldGuides: Record<(typeof commonRequiredFields)[number], string> = {
    recipientName: '받는 분 성함과 호칭을 입력해주세요.',
    department: '학과를 입력해주세요.',
    studentId: '학번을 입력해주세요.',
    studentName: '이름을 입력해주세요.',
    details: '전달할 구체 내용을 입력해주세요.',
  }

  const missingCommonField = commonRequiredFields.find((field) => emailDraftInput[field].trim().length === 0)
  if (missingCommonField) return fieldGuides[missingCommonField]
  if (emailSituationId === 'meeting_request' && emailDraftInput.availableTimes.trim().length === 0) {
    return '가능한 시간대를 입력해주세요.'
  }
  return null
}

type EmailTextFieldProps = {
  field: keyof EmailDraftInput
  label: string
  onChange: (field: keyof EmailDraftInput, value: string) => void
  placeholder?: string
  value: string
}

function EmailTextField({ field, label, onChange, placeholder, value }: EmailTextFieldProps) {
  const maxLength = emailDraftFieldMaxLengths[field]

  return (
    <label className="email-field">
      <span>
        {label} <em aria-hidden="true">필수</em>
      </span>
      <input
        aria-label={label}
        maxLength={maxLength}
        onChange={(event) => onChange(field, event.target.value)}
        placeholder={placeholder}
        required
        type="text"
        value={value}
      />
      <small className="field-count">{value.length}/{maxLength}자</small>
    </label>
  )
}

function EmailDetailsForm({
  emailDraftInput,
  emailSituationId,
  headingRef,
  onBack,
  onChange,
  onClear,
  onGenerate,
}: EmailDetailsFormProps) {
  const missingGuide = missingGuideFor(emailSituationId, emailDraftInput)
  const detailsMaxLength = emailDraftFieldMaxLengths.details
  const availableTimesMaxLength = emailDraftFieldMaxLengths.availableTimes

  return (
    <div className="demo-panel wizard-panel">
      <button className="wizard-back" onClick={onBack} type="button">
        ← 이메일 상황 다시 고르기
      </button>
      <AssistantPrompt
        assistantName="교수냥"
        avatarAsset={catAssistantAssets.professor}
        description="입력한 사실만 사용해서 제목과 본문이 있는 이메일 세 가지를 준비할게요."
        headingRef={headingRef}
        title="이메일에 들어갈 내용을 알려주라냥"
      />

      <form
        className="chat-form-surface email-details-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (missingGuide === null) onGenerate()
        }}
      >
        <EmailTextField
          field="recipientName"
          label="받는 분 성함과 호칭"
          onChange={onChange}
          placeholder="김민서 교수님 또는 박지훈 조교님"
          value={emailDraftInput.recipientName}
        />
        <EmailTextField
          field="department"
          label="학과"
          onChange={onChange}
          value={emailDraftInput.department}
        />
        <EmailTextField
          field="studentId"
          label="학번"
          onChange={onChange}
          value={emailDraftInput.studentId}
        />
        <EmailTextField
          field="studentName"
          label="이름"
          onChange={onChange}
          value={emailDraftInput.studentName}
        />

        <label className="email-field">
          <span>
            전달할 구체 내용 <em aria-hidden="true">필수</em>
          </span>
          <textarea
            aria-label="전달할 구체 내용"
            maxLength={detailsMaxLength}
            onChange={(event) => onChange('details', event.target.value)}
            placeholder="수업명, 요청 이유처럼 교수님께 꼭 전할 사실을 적어주세요."
            required
            value={emailDraftInput.details}
          />
          <small className="field-count">{emailDraftInput.details.length}/{detailsMaxLength}자</small>
        </label>

        {emailSituationId === 'meeting_request' && (
          <>
            <label className="email-field">
              <span>
                가능한 시간대 2~3개 <em aria-hidden="true">필수</em>
              </span>
              <textarea
                aria-label="가능한 시간대 2~3개"
                maxLength={availableTimesMaxLength}
                onChange={(event) => onChange('availableTimes', event.target.value)}
                placeholder="예: 화요일 오후 2~4시, 목요일 오전 10~12시"
                required
                value={emailDraftInput.availableTimes}
              />
              <small className="field-count">
                {emailDraftInput.availableTimes.length}/{availableTimesMaxLength}자
              </small>
            </label>

            <label className="email-field">
              <span>면담 방식 (선택)</span>
              <select
                aria-label="면담 방식 (선택)"
                onChange={(event) => onChange('meetingMethod', event.target.value)}
                value={emailDraftInput.meetingMethod}
              >
                <option value="">선택하지 않음</option>
                <option value="대면">대면</option>
                <option value="온라인">온라인</option>
                <option value="대면 또는 온라인">대면 또는 온라인 모두 가능</option>
              </select>
            </label>
          </>
        )}

        <p className="privacy-note">
          <strong>이 이메일의 약속</strong>
          입력 내용과 결과는 마지막 선택 후 30분 동안 이 탭에만 보관되고, 서버나 AI로 보내지지 않아요.
        </p>
        <button className="generate-button" disabled={missingGuide !== null} type="submit">
          이메일 3가지 만들기
        </button>
        {missingGuide && (
          <p className="generate-guide" role="status">
            {missingGuide}
          </p>
        )}
        <button className="privacy-clear" onClick={onClear} type="button">
          이 탭의 작성 내용 지우기
        </button>
      </form>
    </div>
  )
}

export default EmailDetailsForm
