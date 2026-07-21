import {
  emailDraftFieldMaxLengths,
  emailToneLabels,
  type EmailDraftInput,
  type EmailSituationId,
  type ToneLevel,
} from './message.js'

export type EmailCandidate = {
  toneLevel: ToneLevel
  toneLabel: string
  subject: string
  body: string
}

type NormalizedEmailDraftInput = EmailDraftInput
type EmailCandidateBuilder = (input: NormalizedEmailDraftInput) => EmailCandidate[]

const commonRequiredFields: Array<keyof EmailDraftInput> = [
  'recipientName',
  'department',
  'studentId',
  'studentName',
  'details',
]

const normalizeEmailDraftInput = (input: EmailDraftInput): NormalizedEmailDraftInput => ({
  recipientName: input.recipientName.trim(),
  department: input.department.trim(),
  studentId: input.studentId.trim(),
  studentName: input.studentName.trim(),
  details: input.details.trim(),
  availableTimes: input.availableTimes.trim(),
  meetingMethod: input.meetingMethod.trim(),
})

const isValidEmailDraftInput = (emailSituationId: EmailSituationId, input: NormalizedEmailDraftInput): boolean => {
  for (const [field, maxLength] of Object.entries(emailDraftFieldMaxLengths) as Array<
    [keyof EmailDraftInput, number]
  >) {
    if (input[field].length > maxLength) return false
  }

  if (commonRequiredFields.some((field) => input[field].length === 0)) return false
  return emailSituationId !== 'meeting_request' || input.availableTimes.length > 0
}

const candidate = (toneLevel: ToneLevel, subject: string, body: string): EmailCandidate => ({
  toneLevel,
  toneLabel: emailToneLabels[toneLevel],
  subject,
  body,
})

const identitySubject = (input: NormalizedEmailDraftInput, topic: string): string =>
  `${input.department}/${input.studentId} ${input.studentName} ${topic}`

const identityLine = (input: NormalizedEmailDraftInput): string =>
  `${input.department} ${input.studentId} ${input.studentName}입니다.`

const greetingLine = (input: NormalizedEmailDraftInput): string =>
  `${input.recipientName}, 안녕하세요.`

const closingLines = (input: NormalizedEmailDraftInput): string =>
  `감사합니다.\n${input.studentName} 드림`

const meetingMethodLine = (input: NormalizedEmailDraftInput): string =>
  input.meetingMethod ? `\n면담 방식: ${input.meetingMethod}` : ''

const buildMeetingRequest: EmailCandidateBuilder = (input) => [
  candidate(
    1,
    identitySubject(input, '면담 요청드립니다'),
    `${greetingLine(input)}\n${identityLine(input)}\n\n면담을 요청드리고자 메일드립니다.\n${input.details}\n가능한 시간은 ${input.availableTimes}입니다.${meetingMethodLine(input)}\n가능하신 시간을 알려주시면 감사하겠습니다.\n\n${closingLines(input)}`,
  ),
  candidate(
    2,
    `면담 요청 | ${input.department} ${input.studentId} ${input.studentName}`,
    `${greetingLine(input)}\n${identityLine(input)}\n\n면담을 정중히 요청드리고자 메일드립니다.\n${input.details}\n제가 가능한 시간은 ${input.availableTimes}입니다.${meetingMethodLine(input)}\n가능하실 때 면담 가능 여부와 시간을 알려주시면 감사하겠습니다.\n\n읽어주셔서 감사합니다.\n${input.studentName} 드림`,
  ),
  candidate(
    3,
    `${input.department} ${input.studentId} | 면담 가능 시간 문의`,
    `${greetingLine(input)}\n${identityLine(input)}\n\n${input.details}\n가능 시간: ${input.availableTimes}${meetingMethodLine(input)}\n면담 가능 여부를 회신해 주시면 감사하겠습니다.\n\n${closingLines(input)}`,
  ),
]

const buildCourseQuestion: EmailCandidateBuilder = (input) => [
  candidate(
    1,
    identitySubject(input, '수업·과제 관련 질문드립니다'),
    `${greetingLine(input)}\n${identityLine(input)}\n\n수업·과제와 관련해 질문드리고자 메일드립니다.\n${input.details}\n확인해 주시면 감사하겠습니다.\n\n${closingLines(input)}`,
  ),
  candidate(
    2,
    `수업·과제 질문 | ${input.department} ${input.studentId} ${input.studentName}`,
    `${greetingLine(input)}\n${identityLine(input)}\n\n수업·과제와 관련해 문의드릴 내용이 있어 메일드립니다.\n${input.details}\n가능하실 때 답변해 주시면 감사하겠습니다.\n\n읽어주셔서 감사합니다.\n${input.studentName} 드림`,
  ),
  candidate(
    3,
    `${input.department} ${input.studentId} | 수업·과제 질문`,
    `${greetingLine(input)}\n${identityLine(input)}\n\n${input.details}\n확인 부탁드립니다.\n\n${closingLines(input)}`,
  ),
]

const buildAbsenceNotice: EmailCandidateBuilder = (input) => [
  candidate(
    1,
    identitySubject(input, '결석 관련 문의드립니다'),
    `${greetingLine(input)}\n${identityLine(input)}\n\n결석과 관련해 문의드리고자 메일드립니다.\n${input.details}\n확인해 주시면 감사하겠습니다.\n\n${closingLines(input)}`,
  ),
  candidate(
    2,
    `결석 문의 | ${input.department} ${input.studentId} ${input.studentName}`,
    `${greetingLine(input)}\n${identityLine(input)}\n\n결석 관련 내용을 말씀드리고 문의드리고자 메일드립니다.\n${input.details}\n가능하실 때 확인해 주시면 감사하겠습니다.\n\n읽어주셔서 감사합니다.\n${input.studentName} 드림`,
  ),
  candidate(
    3,
    `${input.department} ${input.studentId} | 결석 문의`,
    `${greetingLine(input)}\n${identityLine(input)}\n\n결석 관련 문의입니다.\n${input.details}\n확인 부탁드립니다.\n\n${closingLines(input)}`,
  ),
]

const buildDeadlineExtension: EmailCandidateBuilder = (input) => [
  candidate(
    1,
    identitySubject(input, '기한 조정 요청드립니다'),
    `${greetingLine(input)}\n${identityLine(input)}\n\n기한 조정을 요청드리고자 메일드립니다.\n${input.details}\n검토해 주시면 감사하겠습니다.\n\n${closingLines(input)}`,
  ),
  candidate(
    2,
    `기한 조정 요청 | ${input.department} ${input.studentId} ${input.studentName}`,
    `${greetingLine(input)}\n${identityLine(input)}\n\n기한 조정 가능 여부를 조심스럽게 여쭙고자 메일드립니다.\n${input.details}\n가능하실 때 검토해 주시면 감사하겠습니다.\n\n읽어주셔서 감사합니다.\n${input.studentName} 드림`,
  ),
  candidate(
    3,
    `${input.department} ${input.studentId} | 기한 조정 문의`,
    `${greetingLine(input)}\n${identityLine(input)}\n\n기한 조정을 요청드립니다.\n${input.details}\n가능 여부를 알려주시면 감사하겠습니다.\n\n${closingLines(input)}`,
  ),
]

const buildRecommendationRequest: EmailCandidateBuilder = (input) => [
  candidate(
    1,
    identitySubject(input, '추천·자문 요청드립니다'),
    `${greetingLine(input)}\n${identityLine(input)}\n\n추천·자문을 요청드리고자 메일드립니다.\n${input.details}\n가능 여부를 알려주시면 감사하겠습니다.\n\n${closingLines(input)}`,
  ),
  candidate(
    2,
    `추천·자문 요청 | ${input.department} ${input.studentId} ${input.studentName}`,
    `${greetingLine(input)}\n${identityLine(input)}\n\n추천·자문을 조심스럽게 요청드리고자 메일드립니다.\n${input.details}\n가능하실 때 검토해 주시면 감사하겠습니다.\n\n읽어주셔서 감사합니다.\n${input.studentName} 드림`,
  ),
  candidate(
    3,
    `${input.department} ${input.studentId} | 추천·자문 요청`,
    `${greetingLine(input)}\n${identityLine(input)}\n\n추천·자문을 요청드립니다.\n${input.details}\n가능 여부를 회신해 주시면 감사하겠습니다.\n\n${closingLines(input)}`,
  ),
]

const buildThanksFollowup: EmailCandidateBuilder = (input) => [
  candidate(
    1,
    identitySubject(input, '감사 및 후속 연락드립니다'),
    `${greetingLine(input)}\n${identityLine(input)}\n\n감사 말씀과 후속 내용을 전하고자 메일드립니다.\n${input.details}\n다시 한번 감사드립니다.\n\n${closingLines(input)}`,
  ),
  candidate(
    2,
    `감사·후속 연락 | ${input.department} ${input.studentId} ${input.studentName}`,
    `${greetingLine(input)}\n${identityLine(input)}\n\n감사 인사와 후속 내용을 전하고자 메일드립니다.\n${input.details}\n확인해 주시면 감사하겠습니다.\n\n읽어주셔서 감사합니다.\n${input.studentName} 드림`,
  ),
  candidate(
    3,
    `${input.department} ${input.studentId} | 감사 말씀드립니다`,
    `${greetingLine(input)}\n${identityLine(input)}\n\n감사 및 후속 연락드립니다.\n${input.details}\n감사합니다.\n\n${input.studentName} 드림`,
  ),
]

const emailCandidateBuilders: Record<EmailSituationId, EmailCandidateBuilder> = {
  meeting_request: buildMeetingRequest,
  course_question: buildCourseQuestion,
  absence_notice: buildAbsenceNotice,
  deadline_extension: buildDeadlineExtension,
  recommendation_request: buildRecommendationRequest,
  thanks_followup: buildThanksFollowup,
}

export const emailTemplateCandidatesFor = (
  emailSituationId: EmailSituationId,
  input: EmailDraftInput,
): EmailCandidate[] | null => {
  const normalizedInput = normalizeEmailDraftInput(input)
  if (!isValidEmailDraftInput(emailSituationId, normalizedInput)) return null

  const builder = emailCandidateBuilders[emailSituationId]
  if (!builder) return null
  return builder(normalizedInput)
}

export const emailCandidateToClipboardText = (emailCandidate: EmailCandidate): string =>
  `제목: ${emailCandidate.subject}\n\n${emailCandidate.body}`
