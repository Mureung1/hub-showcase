/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  emailDraftFieldMaxLengths,
  emailToneLabels,
  type EmailDraftInput,
  type EmailSituationId,
} from './message'
import { hasPlaceholder } from './placeholders'
import {
  emailCandidateToClipboardText,
  emailTemplateCandidatesFor,
  type EmailCandidate,
} from './emailTemplates'

const emailSituationIds: EmailSituationId[] = [
  'meeting_request',
  'course_question',
  'absence_notice',
  'deadline_extension',
  'recommendation_request',
  'thanks_followup',
]

const validInput: EmailDraftInput = {
  recipientName: '김민서 교수님',
  department: '국어국문학과',
  studentId: '20260001',
  studentName: '이다은',
  details: '전달할 구체 내용 토큰입니다.',
  availableTimes: '월요일 오후 두 시와 화요일 오전 열한 시',
  meetingMethod: '대면 또는 온라인',
}

const reviewInputs: Record<EmailSituationId, EmailDraftInput> = {
  meeting_request: {
    recipientName: '김민서 교수님',
    department: '국어국문학과',
    studentId: '20260001',
    studentName: '이다은',
    details: '수업 내용과 과제 방향에 대해 상담을 요청드리고 싶습니다.',
    availableTimes: '월요일 오후 2시, 화요일 오전 11시, 수요일 오후 4시',
    meetingMethod: '대면 또는 온라인',
  },
  course_question: {
    recipientName: '김민서 교수님',
    department: '국어국문학과',
    studentId: '20260001',
    studentName: '이다은',
    details: '과제 2의 제출 형식과 참고문헌 표기 방법을 확인하고 싶습니다.',
    availableTimes: '',
    meetingMethod: '',
  },
  absence_notice: {
    recipientName: '김민서 교수님',
    department: '국어국문학과',
    studentId: '20260001',
    studentName: '이다은',
    details: '건강상의 이유로 7월 20일 수업에 참석하기 어려워 출석 처리와 보완 방법을 문의드립니다.',
    availableTimes: '',
    meetingMethod: '',
  },
  deadline_extension: {
    recipientName: '김민서 교수님',
    department: '국어국문학과',
    studentId: '20260001',
    studentName: '이다은',
    details: '팀 프로젝트 일정이 겹쳐 과제 제출 기한을 7월 25일까지 조정할 수 있는지 여쭙습니다.',
    availableTimes: '',
    meetingMethod: '',
  },
  recommendation_request: {
    recipientName: '김민서 교수님',
    department: '국어국문학과',
    studentId: '20260001',
    studentName: '이다은',
    details: '교환학생 지원에 필요한 추천서 작성이 가능하신지 문의드립니다.',
    availableTimes: '',
    meetingMethod: '',
  },
  thanks_followup: {
    recipientName: '김민서 교수님',
    department: '국어국문학과',
    studentId: '20260001',
    studentName: '이다은',
    details: '지난 면담에서 알려주신 연구 주제를 더 찾아보았고, 도움 주신 점에 감사드립니다.',
    availableTimes: '',
    meetingMethod: '',
  },
}

const combinedCandidateText = (emailCandidate: EmailCandidate): string =>
  `${emailCandidate.subject}\n${emailCandidate.body}`

describe('교수·조교 이메일 정적 템플릿', () => {
  it('6상황에 정확히 3개씩 총 18개 제목·본문 후보를 제공한다', () => {
    const allCandidates: EmailCandidate[] = []

    for (const emailSituationId of emailSituationIds) {
      const candidates = emailTemplateCandidatesFor(emailSituationId, validInput)

      expect(candidates, emailSituationId).not.toBeNull()
      expect(candidates).toHaveLength(3)
      expect(candidates?.map((candidate) => candidate.toneLevel)).toEqual([1, 2, 3])
      expect(candidates?.map((candidate) => candidate.toneLabel)).toEqual([
        emailToneLabels[1],
        emailToneLabels[2],
        emailToneLabels[3],
      ])
      for (const candidate of candidates ?? []) {
        expect(candidate.subject.length).toBeGreaterThan(0)
        expect(candidate.body.length).toBeGreaterThan(0)
        expect(candidate.subject).toBe(candidate.subject.trim())
        expect(candidate.body).toBe(candidate.body.trim())
        expect(candidate.body).toMatch(/(습니다|드립니다|합니다)/)
      }
      allCandidates.push(...(candidates ?? []))
    }

    expect(allCandidates).toHaveLength(18)
    expect(new Set(allCandidates.map(combinedCandidateText)).size).toBe(18)
  })

  it('완성된 18후보의 제목과 본문을 자리 표시자로 오인하지 않는다', () => {
    for (const emailSituationId of emailSituationIds) {
      const candidates = emailTemplateCandidatesFor(emailSituationId, validInput) ?? []

      expect(candidates).toHaveLength(3)
      for (const candidate of candidates) {
        expect(hasPlaceholder(candidate.subject), candidate.subject).toBe(false)
        expect(hasPlaceholder(candidate.body), candidate.body).toBe(false)
      }
    }
  })

  it('세 후보 모두 공통 입력 사실을 포함하고 입력값을 trim한다', () => {
    const paddedInput: EmailDraftInput = {
      recipientName: '  김민서 교수님  ',
      department: '  국어국문학과  ',
      studentId: '  20260001  ',
      studentName: '  이다은  ',
      details: '  전달할 구체 내용 토큰입니다.  ',
      availableTimes: '  월요일 오후 두 시와 화요일 오전 열한 시  ',
      meetingMethod: '  대면 또는 온라인  ',
    }
    const candidates = emailTemplateCandidatesFor('meeting_request', paddedInput) ?? []

    expect(candidates).toHaveLength(3)
    for (const candidate of candidates) {
      const combinedText = combinedCandidateText(candidate)
      for (const value of Object.values(validInput)) {
        expect(combinedText).toContain(value)
      }
      expect(combinedText).not.toContain('  김민서 교수님  ')
      expect(combinedText).not.toContain('  전달할 구체 내용 토큰입니다.  ')
    }
  })

  it('교수·조교 호칭을 포함한 받는 분 입력을 그대로 사용하고 다른 호칭을 덧붙이지 않는다', () => {
    const professorCandidates = emailTemplateCandidatesFor('course_question', validInput) ?? []
    const assistantCandidates = emailTemplateCandidatesFor('course_question', {
      ...validInput,
      recipientName: '박지훈 조교님',
    }) ?? []

    expect(professorCandidates).toHaveLength(3)
    expect(assistantCandidates).toHaveLength(3)
    for (const candidate of professorCandidates) {
      expect(candidate.body).toMatch(/^김민서 교수님, 안녕하세요\./)
      expect(candidate.body).not.toContain('교수님 교수님')
    }
    for (const candidate of assistantCandidates) {
      expect(candidate.body).toMatch(/^박지훈 조교님, 안녕하세요\./)
      expect(candidate.body).not.toContain('조교님 교수님')
    }
  })

  it('공통 5필드와 면담 가능 시간의 필수 조건을 지킨다', () => {
    const commonRequiredFields: Array<keyof EmailDraftInput> = [
      'recipientName',
      'department',
      'studentId',
      'studentName',
      'details',
    ]

    for (const field of commonRequiredFields) {
      expect(
        emailTemplateCandidatesFor('course_question', { ...validInput, [field]: '   ' }),
        field,
      ).toBeNull()
    }
    expect(emailTemplateCandidatesFor('meeting_request', { ...validInput, availableTimes: '   ' })).toBeNull()
    expect(emailTemplateCandidatesFor('course_question', { ...validInput, availableTimes: '' })).not.toBeNull()
    expect(emailTemplateCandidatesFor('meeting_request', { ...validInput, meetingMethod: '' })).not.toBeNull()
  })

  it('면담 요청만 가능 시간과 선택한 면담 방식을 세 후보에 반영한다', () => {
    const meetingCandidates = emailTemplateCandidatesFor('meeting_request', validInput) ?? []
    const withoutMethod = emailTemplateCandidatesFor('meeting_request', { ...validInput, meetingMethod: '' }) ?? []

    expect(meetingCandidates).toHaveLength(3)
    for (const candidate of meetingCandidates) {
      expect(candidate.body).toContain(validInput.details)
      expect(candidate.body).toContain(validInput.availableTimes)
      expect(candidate.body).toContain(`면담 방식: ${validInput.meetingMethod}`)
    }
    for (const candidate of withoutMethod) {
      expect(candidate.body).not.toContain('면담 방식:')
    }
  })

  it('면담 외 상황은 남아 있는 시간·방식 값을 임의로 사용하지 않는다', () => {
    for (const emailSituationId of emailSituationIds.filter((id) => id !== 'meeting_request')) {
      const candidates = emailTemplateCandidatesFor(emailSituationId, validInput) ?? []

      for (const candidate of candidates) {
        const combinedText = combinedCandidateText(candidate)
        expect(combinedText, emailSituationId).not.toContain(validInput.availableTimes)
        expect(combinedText, emailSituationId).not.toContain(validInput.meetingMethod)
      }
    }
  })

  it('감사·후속 후보는 답변을 요구하지 않고 감사 표현을 과도하게 반복하지 않는다', () => {
    const candidates = emailTemplateCandidatesFor('thanks_followup', reviewInputs.thanks_followup) ?? []

    expect(candidates).toHaveLength(3)
    for (const candidate of candidates) {
      expect(candidate.body).not.toContain('확인해 주시면')
      expect(candidate.body).not.toContain('다시 한번 감사')
      expect(candidate.body.match(/감사/g) ?? []).toHaveLength(2)
    }
  })

  it('공유 최대 길이를 넘는 입력은 거절하고 경계 길이는 허용한다', () => {
    for (const [field, maxLength] of Object.entries(emailDraftFieldMaxLengths) as Array<
      [keyof EmailDraftInput, number]
    >) {
      expect(
        emailTemplateCandidatesFor('meeting_request', { ...validInput, [field]: '가'.repeat(maxLength + 1) }),
        `${field}: over`,
      ).toBeNull()
      expect(
        emailTemplateCandidatesFor('meeting_request', { ...validInput, [field]: '가'.repeat(maxLength) }),
        `${field}: boundary`,
      ).not.toBeNull()
    }
  })

  it('알 수 없는 이메일 상황은 후보를 반환하지 않는다', () => {
    expect(emailTemplateCandidatesFor('unknown' as EmailSituationId, validInput)).toBeNull()
  })

  it('전체 메일 복사용 텍스트는 제목과 본문 사이를 빈 줄로 구분한다', () => {
    const emailCandidate = emailTemplateCandidatesFor('course_question', validInput)?.[0]

    expect(emailCandidate).toBeDefined()
    if (!emailCandidate) return
    expect(emailCandidateToClipboardText(emailCandidate)).toBe(
      `제목: ${emailCandidate.subject}\n\n${emailCandidate.body}`,
    )
  })

  it('사용자 검토표 18행이 현재 템플릿 출력과 일치한다', () => {
    const reviewDraft = readFileSync(
      resolve('harness/tasks/T33-professor-email-format/email-template-review-draft.md'),
      'utf8',
    )
    const reviewRows = reviewDraft.match(/^\| \d+ \|/gm) ?? []
    const candidates = emailSituationIds.flatMap(
      (emailSituationId) => emailTemplateCandidatesFor(emailSituationId, reviewInputs[emailSituationId]) ?? [],
    )

    expect(reviewRows).toHaveLength(18)
    expect(candidates).toHaveLength(18)
    for (const candidate of candidates) {
      expect(reviewDraft, candidate.subject).toContain(`| ${candidate.subject.replaceAll('|', '\\|')} |`)
      expect(reviewDraft, candidate.body).toContain(`| ${candidate.body.replaceAll('\n', '<br>')} |`)
    }
  })
})
