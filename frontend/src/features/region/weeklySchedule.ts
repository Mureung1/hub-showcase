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
