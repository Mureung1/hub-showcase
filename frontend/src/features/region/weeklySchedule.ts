import type { CategoryRule, RegionRuleCategories } from './useRegionOptions'

export const DAY_ORDER = ['월', '화', '수', '목', '금', '토', '일'] as const
export type DayName = (typeof DAY_ORDER)[number]

const CATEGORY_ICONS: Record<string, string> = {
  생활쓰레기: '🗑️',
  음식물쓰레기: '🍚',
  재활용품: '♻️',
}

export interface DayCategoryRule {
  category: string
  rule: CategoryRule
}

export interface DaySchedule {
  name: DayName
  icon: string
  label: string
  rules: DayCategoryRule[]
}

// JS Date.getDay()는 0=일~6=토, 표시 순서(DAY_ORDER)는 월~일이라 인덱스를 맞춰 변환한다.
export function getTodayIndex(): number {
  return (new Date().getDay() + 6) % 7
}

// 대형폐기물은 dow(요일) 개념이 없어(수시 신청/협의 방식) 주간 달력에는 넣지 않는다.
export function buildWeeklySchedule(categories: RegionRuleCategories): DaySchedule[] {
  const dayToRules = new Map<DayName, DayCategoryRule[]>(DAY_ORDER.map((day) => [day, []]))

  for (const [categoryName, rule] of Object.entries(categories)) {
    if (categoryName === '대형폐기물' || !rule || !('dow' in rule)) continue

    // "매일"은 요일 토큰이 아니라 그 자체로 전체 요일을 뜻하는 값이라 "+"로 쪼개면 사라진다 — 실측
    // 정부 데이터에 실제로 나오는 값(예: 음식물쓰레기 매일 수거 지역)이라 별도로 처리한다.
    if (rule.dow.trim() === '매일') {
      for (const day of DAY_ORDER) {
        dayToRules.get(day)?.push({ category: categoryName, rule })
      }
      continue
    }

    for (const rawDay of rule.dow.split('+')) {
      const day = rawDay.trim() as DayName
      if (DAY_ORDER.includes(day)) {
        dayToRules.get(day)?.push({ category: categoryName, rule })
      }
    }
  }

  return DAY_ORDER.map((day) => {
    const dayRules = dayToRules.get(day) ?? []
    if (dayRules.length === 0) {
      return { name: day, icon: '🚫', label: '없음', rules: [] }
    }
    return {
      name: day,
      icon: CATEGORY_ICONS[dayRules[0].category] ?? '🗑️',
      label: dayRules.map((r) => r.category).join('·'),
      rules: dayRules,
    }
  })
}
