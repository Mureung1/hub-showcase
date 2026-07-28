// 트랙 2 §2 회귀 가드 — confidence/matchType이 있을 때만 배지·칩이 나오고, 없는(기존 사진/텍스트/
// 라벨 분석 경로와 동일한) 경우엔 화면이 이전과 똑같이 아무 것도 추가로 그리지 않는지 고정한다.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AnalysisResultCard from './AnalysisResultCard.jsx'

vi.mock('../lib/foodServing.js', () => ({
  requestFoodServing: vi.fn().mockResolvedValue({ matched: false }),
}))

const ANALYSIS = {
  items: [
    { name: '잡곡밥', nutrients: { calories: 300, protein: 6, carbs: 65, fat: 1, fiber: 3, sodium: 5 }, source: 'db', matchType: 'exact' },
    { name: '미역국', nutrients: { calories: 80, protein: 4, carbs: 5, fat: 3, fiber: 1, sodium: 400 }, source: 'estimated', matchType: null },
  ],
  total: { calories: 380, protein: 10, carbs: 70, fat: 4, fiber: 4, sodium: 405 },
}

const SINGLE_ITEM_ANALYSIS = {
  items: [{ name: '잡곡밥', nutrients: { calories: 300, protein: 6, carbs: 65, fat: 1, fiber: 3, sodium: 5 }, source: 'db' }],
  total: { calories: 300, protein: 6, carbs: 65, fat: 1, fiber: 3, sodium: 5 },
}

const BASE_PROPS = {
  analysis: ANALYSIS,
  photoUrl: null,
  mealType: 'lunch',
  recommendedMealType: 'lunch',
  onMealTypeChange: () => {},
  onSave: () => {},
  onRetake: () => {},
  saving: false,
}

describe('AnalysisResultCard — 신뢰도/매칭 방식 노출', () => {
  it('confidence가 없으면(기존 사진/텍스트/라벨 분석 경로) 신뢰도 배지를 그리지 않는다', () => {
    render(<AnalysisResultCard {...BASE_PROPS} />)
    expect(screen.queryByText(/정확도/)).not.toBeInTheDocument()
  })

  it('confidence가 있으면 신뢰도 배지를 그린다', () => {
    render(<AnalysisResultCard {...BASE_PROPS} confidence="high" />)
    expect(screen.getByText('정확도 높음')).toBeInTheDocument()
  })

  it('항목을 펼치면 matchType이 있는 항목만 매칭 방식 칩이 보인다', () => {
    render(<AnalysisResultCard {...BASE_PROPS} confidence="medium" />)

    fireEvent.click(screen.getByText('자세한 식사'))

    expect(screen.getByText('정확히 일치')).toBeInTheDocument() // 잡곡밥(exact)
    expect(screen.queryByText('다른 이름으로 일치')).not.toBeInTheDocument() // 미역국은 matchType null
  })
})

describe('AnalysisResultCard — 저장 전 수동 보정(트랙 2 §4)', () => {
  it('음식이 여러 개면(한 끼 세트) onEditNutrients가 있어도 "직접 수정" 진입점이 없다', () => {
    render(<AnalysisResultCard {...BASE_PROPS} onEditNutrients={() => {}} />)
    expect(screen.queryByText('직접 수정')).not.toBeInTheDocument()
  })

  it('onEditNutrients가 없으면(호출부 미지원) 음식이 1개여도 진입점이 없다', () => {
    render(<AnalysisResultCard {...BASE_PROPS} analysis={SINGLE_ITEM_ANALYSIS} />)
    expect(screen.queryByText('직접 수정')).not.toBeInTheDocument()
  })

  it('음식이 1개고 onEditNutrients가 있으면 진입점이 보이고, 눌러도 아직 콜백은 안 불린다', () => {
    const onEditNutrients = vi.fn()
    render(<AnalysisResultCard {...BASE_PROPS} analysis={SINGLE_ITEM_ANALYSIS} onEditNutrients={onEditNutrients} />)

    fireEvent.click(screen.getByText('직접 수정'))

    expect(screen.getByLabelText('칼로리')).toHaveValue(300)
    expect(onEditNutrients).not.toHaveBeenCalled()
  })

  it('값을 고쳐 적용하면 화면에 보이는(1인분, servings=1) 값 그대로 1인분 기준으로 콜백이 불린다', () => {
    const onEditNutrients = vi.fn()
    render(<AnalysisResultCard {...BASE_PROPS} analysis={SINGLE_ITEM_ANALYSIS} onEditNutrients={onEditNutrients} />)

    fireEvent.click(screen.getByText('직접 수정'))
    fireEvent.change(screen.getByLabelText('칼로리'), { target: { value: '250' } })
    fireEvent.click(screen.getByText('적용'))

    expect(onEditNutrients).toHaveBeenCalledTimes(1)
    const [itemIndex, baseNutrients] = onEditNutrients.mock.calls[0]
    expect(itemIndex).toBe(0)
    expect(baseNutrients.calories).toBe(250)
    expect(baseNutrients.protein).toBe(6) // 안 건드린 값은 그대로 유지
  })

  it('2인분으로 보고 있을 때 고친 값은 servings로 나눠(1인분 기준) 콜백에 실린다', () => {
    const onEditNutrients = vi.fn()
    render(
      <AnalysisResultCard
        {...BASE_PROPS}
        analysis={SINGLE_ITEM_ANALYSIS}
        onEditNutrients={onEditNutrients}
        servings={2}
        onServingsChange={() => {}}
      />,
    )

    fireEvent.click(screen.getByText('직접 수정'))
    // 2인분 표시라 칼로리 입력 초깃값은 600(300*2)이어야 한다.
    expect(screen.getByLabelText('칼로리')).toHaveValue(600)

    fireEvent.change(screen.getByLabelText('칼로리'), { target: { value: '500' } })
    fireEvent.click(screen.getByText('적용'))

    const [, baseNutrients] = onEditNutrients.mock.calls[0]
    expect(baseNutrients.calories).toBe(250) // 500 / 2
  })

  it('빈 값으로 지우고 적용하면 그 항목만 원래 값으로 되돌아간다(실수로 0을 저장하지 않는다)', () => {
    const onEditNutrients = vi.fn()
    render(<AnalysisResultCard {...BASE_PROPS} analysis={SINGLE_ITEM_ANALYSIS} onEditNutrients={onEditNutrients} />)

    fireEvent.click(screen.getByText('직접 수정'))
    fireEvent.change(screen.getByLabelText('칼로리'), { target: { value: '' } })
    fireEvent.click(screen.getByText('적용'))

    const [, baseNutrients] = onEditNutrients.mock.calls[0]
    expect(baseNutrients.calories).toBe(300)
  })

  it('취소하면 콜백 없이 원래 화면(NutrientBars)으로 돌아간다', () => {
    const onEditNutrients = vi.fn()
    render(<AnalysisResultCard {...BASE_PROPS} analysis={SINGLE_ITEM_ANALYSIS} onEditNutrients={onEditNutrients} />)

    fireEvent.click(screen.getByText('직접 수정'))
    fireEvent.click(screen.getByText('취소'))

    expect(onEditNutrients).not.toHaveBeenCalled()
    expect(screen.getByText('직접 수정')).toBeInTheDocument()
  })
})
