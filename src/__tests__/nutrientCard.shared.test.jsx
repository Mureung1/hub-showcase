// 식단 탭과 달력 탭의 "영양소" 카드는 **같은 컴포넌트로 같은 모양**이어야 한다.
//
// 예전엔 같은 정보를 두 탭이 서로 다른 모양으로 그렸다 — 식단은 "16 / 131 g" + "115g 더 필요해요",
// 달력은 "65% 부족". 스타일을 손으로 베껴 맞추면 한쪽만 고칠 때 또 갈라지므로, ① 컴포넌트 공유
// 자체와 ② 그 컴포넌트가 그리는 문구 형식을 둘 다 테스트로 고정한다.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import NutritionStatusPanel from '../components/NutritionStatusPanel.jsx'
import { classifyNutrientStatus, NUTRIENT_STATUS } from '../lib/nutrition.js'

const SRC = path.join(process.cwd(), 'src')
const read = (rel) => readFileSync(path.join(SRC, rel), 'utf8')

describe('영양소 카드 공유', () => {
  it('식단 탭과 달력 탭이 둘 다 NutritionStatusPanel을 쓴다', () => {
    for (const page of ['pages/MealsPage.jsx', 'pages/Calendar.jsx']) {
      const source = read(page)
      expect(source).toMatch(/import NutritionStatusPanel from/)
      expect(source).toMatch(/<NutritionStatusPanel\b/)
    }
  })

  // 식단 탭이 갖고 있던 자체 막대(IntakeBar)가 되살아나면 두 탭이 다시 갈라진다.
  it('식단 탭에 자체 영양 막대 구현이 남아 있지 않다', () => {
    expect(read('pages/MealsPage.jsx')).not.toMatch(/function IntakeBar/)
  })
})

// 목표형(단백질 등)과 한도형(나트륨)의 문구가 반대 방향이어야 한다 — 나트륨에 "더 필요해요"가
// 붙으면 소금을 더 먹으라는 말이 된다.
describe('영양소 카드 표시 형식', () => {
  const recommended = { calories: 2600, protein: 131, carbs: 328, fat: 88, fiber: 30, sodium: 2000 }
  const total = { calories: 1000, protein: 16, carbs: 136, fat: 8, fiber: 14, sodium: 1918 }

  it('섭취량 / 목표치와 남은 양을 함께 보여준다', () => {
    render(<NutritionStatusPanel recommended={recommended} total={total} excludeKeys={['calories']} />)

    expect(screen.getByText('16 / 131 g')).toBeInTheDocument()
    expect(screen.getByText('115g 더 필요해요')).toBeInTheDocument()
    expect(screen.getByText('192g 더 필요해요')).toBeInTheDocument()
  })

  it('한도형(나트륨)은 남은 한도를 알려준다', () => {
    render(<NutritionStatusPanel recommended={recommended} total={total} />)

    expect(screen.getByText('1918 / 2000 mg')).toBeInTheDocument()
    expect(screen.getByText('한도까지 82mg 남았어요')).toBeInTheDocument()
  })

  it('한도를 넘기면 줄여야 할 양으로 문구가 뒤집힌다', () => {
    render(<NutritionStatusPanel recommended={recommended} total={{ ...total, sodium: 2400 }} />)
    expect(screen.getByText('400mg 줄여야 해요')).toBeInTheDocument()
  })

  it('excludeKeys로 뺀 영양소는 그리지 않는다', () => {
    render(<NutritionStatusPanel recommended={recommended} total={total} excludeKeys={['calories']} />)
    expect(screen.queryByText('칼로리')).not.toBeInTheDocument()
  })
})

// 리뷰에서 발견한 회귀: 이 컴포넌트가 한때 "actual >= recommended면 달성, 아니면 부족"이라는
// 자체 이분법을 썼다 — 같은 화면의 DaySummaryCard/TodayScoreSummary(둘 다 classifyNutrientStatus
// 기반 충족/부족/초과 3단계)와 판정 기준이 달라져, 예를 들어 80~100% 구간(이미 "충족")인데도 여기만
// 빨간 "더 필요해요"로 보이는 모순이 생겼다. 여기서는 임계값을 다시 계산하지 않고 nutrition.js의
// classifyNutrientStatus를 그대로 따르는지, 그 3단계 각각이 화면에서 실제로 어떻게 보이는지 고정한다.
describe('영양소 카드 — 3단계 판정과 완전히 일치', () => {
  const recommended = { calories: 2000, protein: 100, carbs: 300, fat: 70, fiber: 25, sodium: 2000 }

  it('80~100%(충족 구간이지만 목표 미달)는 부족이 아니라 달성으로 보인다', () => {
    // protein 85/100 = 0.85 — classifyNutrientStatus 기준 SATISFIED(0.8 이상)이지만 actual<recommended.
    expect(classifyNutrientStatus('protein', 85, 100)).toBe(NUTRIENT_STATUS.SATISFIED)
    render(<NutritionStatusPanel recommended={recommended} total={{ ...recommended, protein: 85 }} excludeKeys={['calories']} />)
    expect(screen.getByText('달성했어요')).toBeInTheDocument()
    expect(screen.queryByText(/더 필요해요/)).not.toBeInTheDocument()
  })

  it('150%를 넘는 목표형 영양소는 초과로 경고한다(그냥 달성으로 보이지 않는다)', () => {
    // fat 150/70 ≈ 2.14 — EXCEEDED(1.5 초과).
    expect(classifyNutrientStatus('fat', 150, 70)).toBe(NUTRIENT_STATUS.EXCEEDED)
    render(<NutritionStatusPanel recommended={recommended} total={{ ...recommended, fat: 150 }} excludeKeys={['calories']} />)
    expect(screen.getByText('적정량보다 80g 많아요')).toBeInTheDocument()
  })
})
