export type ScenarioId = 'groupwork' | 'professor' | 'senior' | 'friend'
export type PurposeId = 'ask' | 'apologize' | 'decline' | 'question' | 'suggest' | 'other'
export type ToneLevel = 1 | 2 | 3
export type Mode = 'reply' | 'initiate'
export type Step = 'mode' | 'scenario' | 'situation' | 'manual' | 'result'
export type Source = 'template' | 'ai'
export type SituationId =
  | 'schedule'
  | 'thanks_check'
  | 'ask'
  | 'apologize'
  | 'decline'
  | 'contribution_check'
  | 'absence_inquiry'
  | 'casual_request'
  | 'express_feelings'

export type Scenario = {
  id: ScenarioId
  helper: string
  name: string
  summary: string
  example: string
}

export type Purpose = {
  id: PurposeId
  label: string
}

export type SituationCard = {
  id: SituationId
  label: string
}

export type Candidate = {
  toneLevel: ToneLevel
  toneLabel: string
  text: string
}

export type CatAssistantAsset = {
  alt: string
  assetPath: string | null
  crop?: 'head'
}

const scenarioIds: ScenarioId[] = ['groupwork', 'professor', 'senior', 'friend']
const purposeIds: PurposeId[] = ['ask', 'apologize', 'decline', 'question', 'suggest', 'other']
const situationIds: SituationId[] = [
  'schedule',
  'thanks_check',
  'ask',
  'apologize',
  'decline',
  'contribution_check',
  'absence_inquiry',
  'casual_request',
  'express_feelings',
]

export const isScenarioId = (value: unknown): value is ScenarioId =>
  typeof value === 'string' && scenarioIds.includes(value as ScenarioId)

export const isPurposeId = (value: unknown): value is PurposeId =>
  typeof value === 'string' && purposeIds.includes(value as PurposeId)

export const isSituationId = (value: unknown): value is SituationId =>
  typeof value === 'string' && situationIds.includes(value as SituationId)

export const isToneLevel = (value: unknown): value is ToneLevel => value === 1 || value === 2 || value === 3

export const scenarios: Scenario[] = [
  {
    id: 'groupwork',
    helper: '팀플냥',
    name: '팀플·조모임',
    summary: '할 말은 해야 할 때',
    example: '자료 마감이 오늘인데 팀원이 아직 공유를 안 했어요.',
  },
  {
    id: 'professor',
    helper: '교수냥',
    name: '교수님·조교님',
    summary: '결석·기한 연장·질문, 정중하게',
    example: '과제 제출 기한을 하루만 연장 가능한지 여쭤보고 싶어요.',
  },
  {
    id: 'senior',
    helper: '선배냥',
    name: '선배·동기',
    summary: '존댓말 수위가 애매할 때',
    example: '동아리 회의 시간을 다시 확인하고 싶어요.',
  },
  {
    id: 'friend',
    helper: '연인냥',
    name: '친구·연인',
    summary: '마음은 있는데 말이 안 나올 때',
    example: '약속을 미뤄야 하는데 서운하지 않게 말하고 싶어요.',
  },
]

export const dabnyangiAsset: CatAssistantAsset = {
  alt: '답냥이 고양이 조력자',
  assetPath: '/cats/dabnyangi-main.webp',
}

export const catAssistantAssets: Record<ScenarioId, CatAssistantAsset> = {
  groupwork: { alt: '팀플냥 고양이 조력자', assetPath: '/cats/groupwork-cat.webp' },
  professor: { alt: '교수냥 고양이 조력자', assetPath: '/cats/professor-cat.webp' },
  senior: { alt: '선배냥 고양이 조력자', assetPath: '/cats/senior-cat.webp' },
  friend: { alt: '연인냥 고양이 조력자', assetPath: '/cats/friend-cat.webp' },
}

export const catStageAssetPaths: Record<ScenarioId, string> = {
  groupwork: '/cats/groupwork-cat-stage.webp',
  professor: '/cats/professor-cat-stage.webp',
  senior: '/cats/senior-cat-stage.webp',
  friend: '/cats/friend-cat-stage.webp',
}

export const purposes: Purpose[] = [
  { id: 'ask', label: '부탁하기' },
  { id: 'apologize', label: '사과하기' },
  { id: 'decline', label: '거절하기' },
  { id: 'question', label: '질문하기' },
  { id: 'suggest', label: '제안·확인하기' },
  { id: 'other', label: '기타' },
]

export const toneLabels: Record<ToneLevel, string> = {
  1: '기본',
  2: '더 부드럽게',
  3: '더 분명하게',
}

const commonSituations: SituationCard[] = [
  { id: 'schedule', label: '일정 조율' },
  { id: 'thanks_check', label: '감사·확인' },
  { id: 'ask', label: '부탁' },
  { id: 'apologize', label: '답장이 늦었을 때 사과' },
  { id: 'decline', label: '거절' },
]

const specificSituation: Record<ScenarioId, SituationCard> = {
  groupwork: { id: 'contribution_check', label: '몫 확인·재촉' },
  professor: { id: 'absence_inquiry', label: '결석·과제 문의' },
  senior: { id: 'casual_request', label: '말 편하게 하자고 하기' },
  friend: { id: 'express_feelings', label: '마음 표현하기' },
}

export const situationCardsFor = (scenarioId: ScenarioId): SituationCard[] => [
  ...commonSituations,
  specificSituation[scenarioId],
]
