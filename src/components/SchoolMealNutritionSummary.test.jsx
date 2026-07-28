import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SchoolMealNutritionSummary from './SchoolMealNutritionSummary.jsx'

const RECOMMENDED = { calories: 2000, protein: 60, carbs: 300, fat: 60, fiber: 25, sodium: 2000 }

describe('SchoolMealNutritionSummary', () => {
  it('recommended가 없으면 아무 것도 그리지 않는다', () => {
    const { container } = render(
      <SchoolMealNutritionSummary recommended={null} mealTotal={{ calories: 500 }} mealType="lunch" />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('mealTotal이 없으면 아무 것도 그리지 않는다', () => {
    const { container } = render(<SchoolMealNutritionSummary recommended={RECOMMENDED} mealTotal={null} mealType="lunch" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('부족한 영양소가 있으면 안내 메시지를 그린다', () => {
    const mealTotal = { calories: 700, protein: 10, carbs: 100, fat: 20, fiber: 10, sodium: 500 }
    render(<SchoolMealNutritionSummary recommended={RECOMMENDED} mealTotal={mealTotal} mealType="lunch" />)
    expect(screen.getByText('이 급식엔 단백질이 부족했어요. 저녁에 채워보세요.')).toBeInTheDocument()
  })

  it('충분히 채웠으면 축하 메시지를 그린다', () => {
    const mealTotal = { calories: 2000, protein: 60, carbs: 300, fat: 60, fiber: 25, sodium: 500 }
    render(<SchoolMealNutritionSummary recommended={RECOMMENDED} mealTotal={mealTotal} mealType="lunch" />)
    expect(screen.getByText('이 급식으로 필요한 영양을 고루 채웠어요.')).toBeInTheDocument()
  })
})
