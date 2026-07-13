import type { Task } from '../types'

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function next25thOfFollowingMonth(closureDate: Date): Date {
  const year = closureDate.getFullYear()
  const month = closureDate.getMonth()
  return new Date(year, month + 1, 25)
}

function may31OfNextYear(closureDate: Date): Date {
  return new Date(closureDate.getFullYear() + 1, 4, 31)
}

export const tasks: Task[] = [
  {
    id: 'business-closure-report',
    group: 'closure',
    title: '관할 세무서 폐업신고',
    description: '사업을 그만두는 모든 사업자가 관할 세무서 또는 홈택스에서 처리해야 하는 기본 신고입니다.',
    sourceUrl: 'https://www.hometax.go.kr',
    sourceLabel: '홈택스',
    lastCheckedDate: '2026-07-01',
    condition: () => true,
    reason: () => '모든 사업자가 공통으로 처리해야 해요',
    dueDate: (profile) => addDays(new Date(profile.closureDate), 20),
  },
  {
    id: 'insurance-loss-report',
    group: 'closure',
    title: '4대보험 상실신고',
    description: '직원이 있던 사업장은 폐업 시 4대사회보험 정보연계센터를 통해 상실신고를 해야 합니다.',
    sourceUrl: 'https://www.4insure.or.kr',
    sourceLabel: '4대사회보험 정보연계센터',
    lastCheckedDate: '2026-07-01',
    condition: (profile) => profile.hasEmployee,
    reason: () => '직원이 있다고 답하셔서 이 항목이 포함됐어요',
    dueDate: (profile) => addDays(new Date(profile.closureDate), 14),
  },
  {
    id: 'food-service-business-report-closure',
    group: 'closure',
    title: '영업신고(일반음식점) 폐업신고',
    description:
      '식품위생법에 따라 영업신고를 한 음식점은 세무서 폐업신고와 별개로 관할 구청(위생과)에도 영업신고 폐업신고를 해야 합니다.',
    sourceUrl: 'https://www.gov.kr',
    sourceLabel: '정부24',
    lastCheckedDate: '2026-07-01',
    condition: (profile) => profile.industry === '요식업',
    reason: () => '요식업이라고 답하셔서 이 항목이 포함됐어요',
  },
  {
    id: 'online-retail-report-closure',
    group: 'closure',
    title: '통신판매업 신고 폐지신고',
    description:
      '온라인 판매로 통신판매업 신고를 한 경우, 폐업 시 관할 시·군·구에 신고 폐지 절차를 진행해야 합니다. 해당 여부는 신고 당시 서류로 확인하세요.',
    sourceUrl: 'https://www.gov.kr',
    sourceLabel: '정부24',
    lastCheckedDate: '2026-07-01',
    condition: (profile) => profile.industry === '소매업',
    reason: () => '소매업이라고 답하셔서 이 항목이 포함됐어요',
  },
  {
    id: 'lease-termination',
    group: 'closure',
    title: '임대차 계약 해지·원상복구 안내',
    description: '임대 사업장은 계약 해지 절차와 원상복구 범위를 임대인과 사전에 확인해야 분쟁을 줄일 수 있습니다.',
    sourceUrl: 'https://easylaw.go.kr',
    sourceLabel: '찾기쉬운 생활법령정보',
    lastCheckedDate: '2026-07-01',
    condition: (profile) => profile.isRented,
    reason: () => '임대 사업장이라고 답하셔서 이 항목이 포함됐어요',
  },
  {
    id: 'vat-final-return',
    group: 'tax',
    title: '부가세 확정신고 일정 안내',
    description: '폐업일이 속한 달의 다음 달 25일까지 부가가치세 확정신고를 해야 합니다. 정확한 세액은 홈택스에서 확인하세요.',
    sourceUrl: 'https://www.hometax.go.kr',
    sourceLabel: '홈택스',
    lastCheckedDate: '2026-07-01',
    condition: () => true,
    reason: () => '모든 사업자가 공통으로 처리해야 해요',
    dueDate: (profile) => next25thOfFollowingMonth(new Date(profile.closureDate)),
  },
  {
    id: 'income-tax-return',
    group: 'tax',
    title: '종합소득세 신고 일정 안내',
    description: '폐업 여부와 관계없이 다음 해 5월에 종합소득세 확정신고를 해야 합니다.',
    sourceUrl: 'https://www.hometax.go.kr',
    sourceLabel: '홈택스',
    lastCheckedDate: '2026-07-01',
    condition: () => true,
    reason: () => '모든 사업자가 공통으로 처리해야 해요',
    dueDate: (profile) => may31OfNextYear(new Date(profile.closureDate)),
  },
  {
    id: 'store-demolition-subsidy',
    group: 'subsidy',
    title: '점포철거비 지원 (희망리턴패키지)',
    description: '임대 사업장의 철거·원상복구 비용을 지원하는 정부 사업입니다. 지원 한도와 조건은 공식 페이지에서 확인하세요.',
    sourceUrl: 'https://hope.sbiz.or.kr',
    sourceLabel: '희망리턴패키지',
    lastCheckedDate: '2026-07-01',
    condition: (profile) => profile.isRented,
    reason: () => '임대 사업장이라고 답하셔서 이 항목이 포함됐어요',
  },
  {
    id: 'reemployment-program',
    group: 'subsidy',
    title: '재창업·재취업 교육 정보',
    description: '폐업 이후 재창업 또는 재취업을 준비하는 소상공인을 위한 교육 프로그램 정보입니다.',
    sourceUrl: 'https://hope.sbiz.or.kr',
    sourceLabel: '희망리턴패키지',
    lastCheckedDate: '2026-07-01',
    condition: () => true,
    reason: () => '모든 사용자에게 제공되는 정보예요',
  },
]

export const groupLabels: Record<Task['group'], string> = {
  closure: '폐업 신고 절차',
  tax: '세무 신고 일정',
  subsidy: '지원금 및 재기 지원',
}
