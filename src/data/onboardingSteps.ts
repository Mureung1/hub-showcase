/**
 * 온보딩 스텝 메타 및 선택지.
 * 출처: prototype/gov_subsidy_home_wireframe.html
 */
import type { OnboardingField } from '../context/OnboardingContext'

export interface SelectOption {
  /** 컨텍스트에 저장되는 값 */
  value: string
  /** 화면에 표시되는 라벨 */
  label: string
  /** 이모지 아이콘 (없을 수 있음) */
  icon?: string
}

export interface StepMeta {
  /** 진행바/네비 표시용 스텝 번호 (1-based) */
  step: number
  /** 저장 대상 필드 (step3는 district, step4는 별도 처리) */
  field: OnboardingField
  /** 질문 — 줄바꿈은 \n */
  question: string
  hint: string
}

export const TOTAL_STEPS = 4

/** 업종 (step1) */
export const INDUSTRY_OPTIONS: SelectOption[] = [
  { value: '음식점', label: '음식점', icon: '🍽️' },
  { value: '카페·베이커리', label: '카페·베이커리', icon: '☕' },
  { value: '소매·유통', label: '소매·유통', icon: '🛒' },
  { value: '서비스업', label: '서비스업 (미용, 세탁 등)', icon: '💼' },
  { value: '제조업', label: '제조업', icon: '🏭' },
  { value: '기타', label: '기타 (직접 입력)', icon: '✏️' },
]

/** 직원 수 (step4) */
export const EMPLOYEE_OPTIONS: SelectOption[] = [
  { value: '없음 (1인)', label: '없음 (1인 사업자)', icon: '👤' },
  { value: '1~4명', label: '1~4명', icon: '👥' },
  { value: '5~9명', label: '5~9명', icon: '👥' },
  { value: '10명 이상', label: '10명 이상', icon: '👥' },
]

/** 연매출 구간 (step4 select) */
export const REVENUE_OPTIONS: string[] = [
  '5천만원 미만',
  '5천만원 ~ 1억원',
  '1억원 ~ 3억원',
  '3억원 ~ 5억원',
  '5억원 이상',
]

/** 스텝별 질문/힌트 (step3 질문은 지역명이 동적으로 앞에 붙음) */
export const STEP_META: Record<number, StepMeta> = {
  1: {
    step: 1,
    field: 'industry',
    question: '어떤 업종으로\n사업하고 계세요?',
    hint: '지원금은 업종별로 다르게 운영돼요',
  },
  2: {
    step: 2,
    field: 'region',
    question: '어디에서\n사업하고 계세요?',
    hint: '지역별 지원금을 찾아드려요',
  },
  3: {
    step: 3,
    field: 'district',
    question: '상세 지역을\n선택해주세요',
    hint: '더 정확한 지원금 매칭을 위해 필요해요',
  },
  4: {
    step: 4,
    field: 'employees',
    question: '사업 규모를\n알려주세요',
    hint: '마지막이에요! 거의 다 됐어요',
  },
}
