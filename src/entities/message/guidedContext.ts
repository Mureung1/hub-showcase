import {
  isSituationForScenario,
  scenarios,
  situationCardsFor,
  type PurposeId,
  type ScenarioId,
  type SituationId,
} from './message.js'

export const guidedContextCatalogVersion = 'guided-context-v1'

export type ContextAnswer = Readonly<{
  questionId: string
  optionId: string
}>

export type GuidedContextOption = Readonly<{
  id: string
  label: string
  promptFact: string
}>

export type GuidedContextQuestion = Readonly<{
  id: string
  scenarioId: ScenarioId
  situationId: SituationId
  purposeId: PurposeId
  prompt: string
  options: readonly [GuidedContextOption, GuidedContextOption, GuidedContextOption]
}>

export type ResolvedGuidedContext = Readonly<{
  catalogVersion: string
  purposeId: PurposeId
  promptFacts: readonly string[]
  questionIds: readonly string[]
  optionIds: readonly string[]
}>

type OptionSeed = readonly [suffix: string, label: string, promptFact: string]

const createQuestion = (
  scenarioId: ScenarioId,
  situationId: SituationId,
  purposeId: PurposeId,
  prompt: string,
  optionSeeds: readonly [OptionSeed, OptionSeed, OptionSeed],
): GuidedContextQuestion => ({
  id: `cq.${scenarioId}.${situationId}.focus`,
  scenarioId,
  situationId,
  purposeId,
  prompt,
  options: optionSeeds.map(([suffix, label, promptFact]) => ({
    id: `co.${scenarioId}.${situationId}.${suffix}`,
    label,
    promptFact,
  })) as [GuidedContextOption, GuidedContextOption, GuidedContextOption],
})

export const guidedContextQuestions = [
  createQuestion('groupwork', 'schedule', 'suggest', '어떻게 일정을 맞출까요?', [
    ['ask_availability', '가능한 시간 묻기', '상대가 가능한 시간을 질문한다. 특정 후보 시간은 만들지 않는다.'],
    ['confirm_discussed', '정해둔 시간 확인', '앞서 논의한 시간을 확인한다. 정확한 시간이나 최종 확정은 만들지 않는다.'],
    ['recoordinate', '다시 같이 정하기', '일정을 다시 함께 조율하자고 제안한다. 취소나 갈등 원인은 만들지 않는다.'],
  ]),
  createQuestion('groupwork', 'thanks_check', 'other', '어떤 말을 더 앞에 둘까요?', [
    ['confirm_received', '확인했다는 말', '공유된 내용을 확인했다고 말한다. 동의나 과업 완료는 만들지 않는다.'],
    ['thank_share', '공유해준 점에 감사', '무언가를 공유해 준 점에 감사한다. 자료 품질이나 노력 정도는 평가하지 않는다.'],
    ['thank_help', '도와준 점에 감사', '도움을 받은 점에 감사한다. 도움의 범위나 결과는 만들지 않는다.'],
  ]),
  createQuestion('groupwork', 'ask', 'ask', '어떤 도움을 부탁할까요?', [
    ['request_material', '자료 공유 부탁', '팀 자료 공유를 부탁한다. 파일명이나 상대의 소유 여부는 만들지 않는다.'],
    ['request_review', '검토·의견 부탁', '검토와 의견을 부탁한다. 범위, 기한, 긍정 평가는 만들지 않는다.'],
    ['request_task_help', '맡은 일 관련 도움', '자신이 맡은 일과 관련해 도움을 부탁한다. 실패나 상대 책임은 만들지 않는다.'],
  ]),
  createQuestion('groupwork', 'apologize', 'apologize', '어느 점을 사과할까요?', [
    ['late_reply', '답장이 늦은 점', '답장이 늦은 점을 사과한다. 이유나 지연 기간은 만들지 않는다.'],
    ['late_check', '확인이 늦은 점', '확인이 늦은 점을 사과한다. 고의나 영향은 만들지 않는다.'],
    ['delayed_team', '팀 진행을 늦춘 점까지', '자신의 지연이 팀 진행을 늦춘 점까지 인정한다. 피해 정도나 마감 위반은 만들지 않는다.'],
  ]),
  createQuestion('groupwork', 'decline', 'decline', '무엇이 어렵다고 전할까요?', [
    ['decline_request', '이번 부탁', '이번 부탁을 거절한다. 이유나 향후 수락 약속은 만들지 않는다.'],
    ['decline_schedule', '제안된 일정', '제안된 일정 참여가 어렵다고 말한다. 다른 일정도 모두 불가능하다고 만들지 않는다.'],
    ['decline_task', '추가 역할', '추가 역할을 맡기 어렵다고 말한다. 역량 부족이나 타인 책임은 만들지 않는다.'],
  ]),
  createQuestion('groupwork', 'contribution_check', 'question', '무엇을 확인할까요?', [
    ['check_progress', '진행 상황', '현재 진행 상황을 묻는다. 미진행이라고 단정하지 않는다.'],
    ['ask_share_timing', '공유 가능한 시점', '공유 가능한 시점을 묻는다. 임의의 마감이나 약속은 만들지 않는다.'],
    ['ask_blocker', '막힌 점이나 도움 필요 여부', '막힌 점이나 도움이 필요한지 묻는다. 실제 문제가 있다고 단정하지 않는다.'],
  ]),
  createQuestion('professor', 'schedule', 'suggest', '어떤 일정 연락인가요?', [
    ['ask_availability', '가능한 시간 여쭙기', '면담 가능한 시간을 여쭙는다. 특정 시간은 만들지 않는다.'],
    ['confirm_discussed', '논의한 시간 확인', '앞서 논의한 일정을 확인한다. 확정 여부나 정확한 시각은 만들지 않는다.'],
    ['request_change', '일정 변경 가능 여부', '일정 변경이 가능한지 여쭙는다. 승인이나 사유는 만들지 않는다.'],
  ]),
  createQuestion('professor', 'thanks_check', 'other', '무엇에 감사할까요?', [
    ['thank_answer', '답변해주신 점', '답변해 주신 점에 감사한다. 문제가 해결됐다고 만들지 않는다.'],
    ['thank_review', '확인·검토해주신 점', '확인하거나 검토해 주신 점에 감사한다. 긍정 평가를 만들지 않는다.'],
    ['confirm_guidance', '안내 확인과 감사', '안내를 확인했고 감사하다고 말한다. 이행 완료나 동의는 만들지 않는다.'],
  ]),
  createQuestion('professor', 'ask', 'ask', '어떤 부탁을 드릴까요?', [
    ['request_material', '자료·안내 공유', '자료나 안내 공유를 부탁드린다. 받을 권리나 파일명은 만들지 않는다.'],
    ['request_confirmation', '보낸 내용 확인', '앞서 보낸 내용의 확인을 부탁드린다. 처리 완료나 누락은 단정하지 않는다.'],
    ['request_consult', '짧은 상담·조언', '짧은 상담이나 조언을 부탁드린다. 주제, 시간, 수락은 만들지 않는다.'],
  ]),
  createQuestion('professor', 'apologize', 'apologize', '어느 점을 사과드릴까요?', [
    ['late_reply', '답장이 늦은 점', '답장이 늦은 점을 사과드린다. 이유나 기간은 만들지 않는다.'],
    ['late_check', '확인이 늦은 점', '확인이 늦은 점을 사과드린다. 불성실했다고 단정하지 않는다.'],
    ['kept_waiting', '기다리게 한 점까지', '기다리게 한 점까지 인정하고 사과드린다. 상대 감정이나 피해는 만들지 않는다.'],
  ]),
  createQuestion('professor', 'decline', 'decline', '무엇이 어렵다고 말씀드릴까요?', [
    ['decline_schedule', '제안된 일정', '제안된 일정이 어렵다고 말씀드린다. 모든 일정이 불가능하다고 만들지 않는다.'],
    ['decline_participation', '이번 참여', '이번 참여가 어렵다고 말씀드린다. 활동 세부는 만들지 않는다.'],
    ['decline_request', '이번 요청 수행', '이번 요청을 수행하기 어렵다고 말씀드린다. 역량이나 사유는 만들지 않는다.'],
  ]),
  createQuestion('professor', 'absence_inquiry', 'question', '무엇을 여쭤볼까요?', [
    ['ask_attendance_rule', '결석 처리 기준', '결석 처리 기준을 조건형으로 여쭙는다. 실제 결석, 사유, 날짜는 만들지 않는다.'],
    ['ask_assignment', '과제 제출 방법', '과제 제출 방법을 여쭙는다. 과제명이나 기한은 만들지 않는다.'],
    ['ask_materials', '수업 자료·보강 여부', '수업 자료나 보강 여부를 여쭙는다. 제공 약속이나 실제 결석은 만들지 않는다.'],
  ]),
  createQuestion('senior', 'schedule', 'suggest', '어떻게 일정을 확인할까요?', [
    ['ask_availability', '가능한 시간 묻기', '가능한 시간을 묻는다. 특정 후보 시간은 만들지 않는다.'],
    ['confirm_discussed', '정해둔 시간 확인', '앞서 논의한 시간을 확인한다. 확정 여부나 정확한 시간은 만들지 않는다.'],
    ['request_change', '다시 조율하기', '일정을 다시 조율하자고 제안한다. 취소 이유나 상대 가능 여부는 만들지 않는다.'],
  ]),
  createQuestion('senior', 'thanks_check', 'other', '무엇에 고마움을 전할까요?', [
    ['thank_info', '알려준 내용', '정보를 알려준 점에 감사한다. 동의하거나 정확성을 평가하지 않는다.'],
    ['thank_care', '챙겨준 점', '챙겨 준 점에 감사한다. 상대 감정이나 수고 정도는 만들지 않는다.'],
    ['thank_help', '도와준 점', '도와준 점에 감사한다. 도움의 범위나 결과는 만들지 않는다.'],
  ]),
  createQuestion('senior', 'ask', 'ask', '어떤 부탁을 할까요?', [
    ['request_advice', '경험·조언 묻기', '경험이나 조언을 부탁한다. 주제나 전문성은 만들지 않는다.'],
    ['request_material', '자료·정보 부탁', '자료나 정보를 부탁한다. 소유 여부나 파일명은 만들지 않는다.'],
    ['request_short_help', '잠깐 도움 부탁', '잠깐 도움을 부탁한다. 작업 내용이나 소요 시간은 만들지 않는다.'],
  ]),
  createQuestion('senior', 'apologize', 'apologize', '어느 점을 사과할까요?', [
    ['late_reply', '답장이 늦은 점', '답장이 늦은 점을 사과한다. 이유는 만들지 않는다.'],
    ['late_check', '확인이 늦은 점', '확인이 늦은 점을 사과한다. 영향은 만들지 않는다.'],
    ['kept_waiting', '기다리게 한 점까지', '기다리게 한 점까지 인정하고 사과한다. 상대 감정은 만들지 않는다.'],
  ]),
  createQuestion('senior', 'decline', 'decline', '무엇을 거절할까요?', [
    ['decline_meet', '모임·약속', '이번 모임이나 약속을 거절한다. 관계 회피 의도는 만들지 않는다.'],
    ['decline_request', '부탁', '이번 부탁을 거절한다. 능력이나 이유는 만들지 않는다.'],
    ['decline_suggestion', '제안', '이번 제안을 거절한다. 제안 자체를 비판하지 않는다.'],
  ]),
  createQuestion('senior', 'casual_request', 'suggest', '어느 정도로 편하게 말할까요?', [
    ['allow_them_casual', '저에게만 편하게', '상대만 사용자에게 편하게 말해도 된다고 전한다. 사용자도 반말한다고 만들지 않는다.'],
    ['suggest_mutual', '서로 편하게', '서로 편하게 말하자고 제안한다. 상대가 동의했다고 만들지 않는다.'],
    ['allow_either', '존댓말도 반말도 괜찮게', '존댓말과 반말 모두 괜찮다고 전한다. 친밀도나 서열은 만들지 않는다.'],
  ]),
  createQuestion('friend', 'schedule', 'suggest', '어떻게 약속을 맞출까요?', [
    ['ask_availability', '언제 괜찮은지 묻기', '상대가 언제 괜찮은지 묻는다. 특정 시간은 만들지 않는다.'],
    ['choose_together', '같이 정하자고 하기', '일정을 같이 정하자고 제안한다. 상대가 수락했다고 만들지 않는다.'],
    ['request_change', '약속 다시 조율하기', '약속을 다시 조율하자고 요청한다. 취소 이유나 새 일정은 만들지 않는다.'],
  ]),
  createQuestion('friend', 'thanks_check', 'other', '무엇에 고맙다고 할까요?', [
    ['thank_share', '알려주거나 보내준 점', '알려주거나 보내준 점에 감사한다. 내용을 평가하지 않는다.'],
    ['thank_care', '챙겨준 점', '챙겨준 점에 감사한다. 상대 감정은 만들지 않는다.'],
    ['thank_listening', '이야기 들어준 점', '이야기를 들어준 점에 감사한다. 이해나 동의를 만들지 않는다.'],
  ]),
  createQuestion('friend', 'ask', 'ask', '어떤 부탁을 할까요?', [
    ['request_call', '잠깐 통화하기', '잠깐 통화하자고 부탁한다. 시간이나 긴급성은 만들지 않는다.'],
    ['request_listen', '이야기 들어주기', '이야기를 들어 달라고 부탁한다. 문제나 감정 원인은 만들지 않는다.'],
    ['request_accompany', '같이 가주기', '같이 가 달라고 부탁한다. 장소나 시간은 만들지 않는다.'],
  ]),
  createQuestion('friend', 'apologize', 'apologize', '어느 점을 사과할까요?', [
    ['late_reply', '답장이 늦은 점', '답장이 늦은 점을 사과한다. 이유는 만들지 않는다.'],
    ['missed_contact', '연락을 놓친 점', '연락을 제때 보지 못한 점을 사과한다. 고의나 기간은 만들지 않는다.'],
    ['kept_waiting', '기다리게 한 점까지', '기다리게 한 점까지 인정하고 사과한다. 상대 감정이나 피해는 만들지 않는다.'],
  ]),
  createQuestion('friend', 'decline', 'decline', '무엇을 거절할까요?', [
    ['decline_meet', '약속·만남', '이번 약속이나 만남을 거절한다. 관계 회피 의도는 만들지 않는다.'],
    ['decline_request', '부탁', '이번 부탁을 거절한다. 이유나 향후 수락 약속은 만들지 않는다.'],
    ['decline_suggestion', '제안', '이번 제안을 거절한다. 제안 자체를 평가하지 않는다.'],
  ]),
  createQuestion('friend', 'express_feelings', 'other', '어떤 마음을 전할까요?', [
    ['express_gratitude', '고마운 마음', '고마운 마음을 전한다. 계기나 상대 의도는 만들지 않는다.'],
    ['express_affection', '좋아하는 마음', '좋아하는 마음을 전한다. 사랑, 교제, 상호 호감은 만들지 않는다.'],
    ['express_hurt', '서운한 마음', '서운한 마음을 전한다. 상대 잘못, 원인, 이별 의사는 만들지 않는다.'],
  ]),
] as const satisfies readonly GuidedContextQuestion[]

export const guidedContextQuestionFor = (
  scenarioId: ScenarioId,
  situationId: SituationId,
): GuidedContextQuestion | null =>
  guidedContextQuestions.find(
    (question) => question.scenarioId === scenarioId && question.situationId === situationId,
  ) ?? null

export const resolveGuidedContext = (
  scenarioId: ScenarioId,
  situationId: SituationId,
  answers: readonly ContextAnswer[],
): ResolvedGuidedContext | null => {
  if (!isSituationForScenario(scenarioId, situationId) || answers.length !== 1) return null
  const question = guidedContextQuestionFor(scenarioId, situationId)
  const answer = answers[0]
  if (!question || answer.questionId !== question.id) return null
  const option = question.options.find((candidate) => candidate.id === answer.optionId)
  if (!option) return null

  return {
    catalogVersion: guidedContextCatalogVersion,
    purposeId: question.purposeId,
    promptFacts: [option.promptFact],
    questionIds: [question.id],
    optionIds: [option.id],
  }
}

export const hasCompleteGuidedContextCoverage = (): boolean =>
  scenarios.every((scenario) =>
    situationCardsFor(scenario.id).every(
      (card) => guidedContextQuestionFor(scenario.id, card.id)?.options.length === 3,
    ),
  )
