import type { Mode, PurposeId, ScenarioId } from '../entities/message'

export type EvaluationCase = {
  id: string
  relationship: string
  scenarioId: ScenarioId
  purpose: PurposeId
  mode: Mode
  situation: string
  receivedMessage?: string
  expectedRules: string[]
}

export const evaluationCases: EvaluationCase[] = [
  {
    id: 'professor-assignment-extension',
    relationship: '교수님',
    scenarioId: 'professor',
    purpose: 'ask',
    mode: 'initiate',
    situation: '몸이 좋지 않아 과제 제출 기한을 하루 연장할 수 있는지 정중하게 여쭙고 싶다.',
    expectedRules: [
      '인사–용건–맺음 구조를 지킨다.',
      '입력에 없는 진단명·날짜·증빙을 지어내지 않는다.',
      '세 후보 모두 정중함을 유지하고 톤만 달라진다.',
      '각 후보가 6문장을 넘지 않는다.',
    ],
  },
  {
    id: 'teaching-assistant-submission-check',
    relationship: '조교님',
    scenarioId: 'professor',
    purpose: 'question',
    mode: 'reply',
    receivedMessage: '이번 주 과제 제출이 확인되지 않습니다. 확인 부탁드립니다.',
    situation: 'LMS에서 제출 상태가 보이지 않아 확인 방법을 여쭙고 싶다.',
    expectedRules: [
      '받은 메시지의 과제 미확인 맥락을 반영한다.',
      '상대에게 책임을 단정하거나 공격적으로 말하지 않는다.',
      '입력에 없는 파일 첨부·시스템 오류 같은 사실을 추가하지 않는다.',
      '확인 요청이 분명해야 한다.',
    ],
  },
  {
    id: 'senior-course-advice',
    relationship: '선배·동기',
    scenarioId: 'senior',
    purpose: 'question',
    mode: 'initiate',
    situation: '안면만 있는 선배에게 다음 학기 수강 과목의 과제량을 물어보고 싶다.',
    expectedRules: [
      '초면에 가까운 관계에 맞는 존댓말을 사용한다.',
      '부담을 낮추되 질문할 내용을 흐리지 않는다.',
      '관계를 실제보다 가깝게 가정하지 않는다.',
      '세 톤 후보가 서로 구분된다.',
    ],
  },
  {
    id: 'friend-apology',
    relationship: '친구·연인',
    scenarioId: 'friend',
    purpose: 'apologize',
    mode: 'reply',
    receivedMessage: '너 요즘 나한테 좀 무심한 것 같아. 서운해.',
    situation: '과제로 바빠 연락이 뜸했던 점을 인정하고 미안하다고 말하고 싶다.',
    expectedRules: [
      '상대의 서운함을 인정하고 변명으로 덮지 않는다.',
      '입력에 없는 약속·선물·날짜를 만들어 내지 않는다.',
      '과도하게 비굴하거나 공격적이지 않다.',
      '메신저에 바로 붙여넣을 수 있는 길이다.',
    ],
  },
]
