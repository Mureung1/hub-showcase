export interface Profile {
  industry: string       // 업종: '요식업' | '소매업' | '서비스업' | '기타'
  isCorporation: boolean // 법인 여부 (false = 개인사업자)
  hasEmployee: boolean   // 직원 유무 → 4대보험 상실신고 항목 포함 여부 결정
  isRented: boolean      // 임대 여부 → 임대차 해지·점포철거비 항목 포함 여부 결정
  closureDate: string    // 폐업 예정일 (ISO 날짜 문자열) → 각 항목 D-day 계산 기준
}

export type TaskGroup = 'closure' | 'tax' | 'subsidy'

export interface Task {
  id: string
  group: TaskGroup
  title: string
  description: string
  sourceUrl: string
  sourceLabel: string
  lastCheckedDate: string
  // 이 사용자에게 이 항목이 해당하는지 판정 — profile을 인자로 받아 boolean 반환
  condition: (profile: Profile) => boolean
  // 왜 이 항목이 포함됐는지 사용자에게 보여줄 근거 문장
  reason: (profile: Profile) => string
  // 마감일 계산 함수. 없으면 D-day 배지를 표시하지 않음 (예: 교육 정보는 마감 없음)
  dueDate?: (profile: Profile) => Date
  // 처리 전 준비해야 할 서류 목록. 없으면 sub-체크리스트 미표시
  documents?: string[]
}
