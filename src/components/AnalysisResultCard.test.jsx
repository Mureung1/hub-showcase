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

    expect(screen.getByLabelText('칼로리')).toHaveValue('300')
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
    expect(screen.getByLabelText('칼로리')).toHaveValue('600')

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

// 조리법 보정 — AI가 정한 DB 검색명이 틀렸을 때 1탭으로 고쳐 재조회하는 줄.
// 이 앱의 정확도는 dbSearchName 하나에 걸려 있고, 그중 가장 자주 틀리는 축이 조리법이다.
describe('AnalysisResultCard — 조리법 보정', () => {
  const CORRECTION = { searchName: '고등어구이', matchedName: '고등어구이', busy: false, onCorrect: () => {} }

  it('correction을 주지 않으면 보정 줄이 아예 안 보인다 — 기존 화면과 동일', () => {
    render(<AnalysisResultCard {...BASE_PROPS} analysis={SINGLE_ITEM_ANALYSIS} />)
    expect(screen.queryByRole('button', { name: '조림' })).not.toBeInTheDocument()
  })

  it('correction을 주면 조리법 칩과 "무엇으로 계산했는지"를 보여준다', () => {
    render(<AnalysisResultCard {...BASE_PROPS} analysis={SINGLE_ITEM_ANALYSIS} correction={CORRECTION} />)
    expect(screen.getByText('고등어구이')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '조림' })).toBeInTheDocument()
  })

  it('현재 조리법 칩은 선택 상태이고 다시 누를 수 없다 — 재조회할 이유가 없으므로', () => {
    render(<AnalysisResultCard {...BASE_PROPS} analysis={SINGLE_ITEM_ANALYSIS} correction={CORRECTION} />)
    const current = screen.getByRole('button', { name: '구이' })
    expect(current).toHaveAttribute('aria-pressed', 'true')
    expect(current).toBeDisabled()
  })

  it('다른 조리법을 누르면 그 조리법으로 재조회를 요청한다', () => {
    const onCorrect = vi.fn()
    render(<AnalysisResultCard {...BASE_PROPS} analysis={SINGLE_ITEM_ANALYSIS} correction={{ ...CORRECTION, onCorrect }} />)
    fireEvent.click(screen.getByRole('button', { name: '조림' }))
    expect(onCorrect).toHaveBeenCalledWith('조림')
  })

  it('DB 매칭에 실패했으면 AI 추정으로 계산했다고 알린다', () => {
    render(
      <AnalysisResultCard {...BASE_PROPS} analysis={SINGLE_ITEM_ANALYSIS} correction={{ ...CORRECTION, matchedName: null }} />,
    )
    expect(screen.getByText(/DB에서 못 찾아 AI 추정으로 계산했어요/)).toBeInTheDocument()
  })

  it('재조회 중에는 칩을 눌러도 요청이 겹치지 않게 막는다', () => {
    const onCorrect = vi.fn()
    render(<AnalysisResultCard {...BASE_PROPS} analysis={SINGLE_ITEM_ANALYSIS} correction={{ ...CORRECTION, busy: true, onCorrect }} />)
    expect(screen.getByRole('button', { name: '조림' })).toBeDisabled()
  })
})

// 판 단위 검증 — 합계가 그 장면의 현실 범위를 벗어났을 때만 뜬다. **수치는 그대로 두고 알리기만**
// 한다(정답지 없이 밴드로 값을 깎지 않는다는 원칙, src/lib/mealStandards.js 참고).
describe('AnalysisResultCard — 판 단위 검증 경고', () => {
  it('plateWarning이 없으면 아무것도 그리지 않는다', () => {
    render(<AnalysisResultCard {...BASE_PROPS} />)
    expect(screen.queryByText(/이례적|보다 많습니다|보다 적습니다/)).not.toBeInTheDocument()
  })

  it('plateWarning이 있으면 문구를 보여주되 합계 수치는 건드리지 않는다', () => {
    render(<AnalysisResultCard {...BASE_PROPS} plateWarning="총 1800kcal은 학교급식 한 끼 기준 약 800kcal보다 많습니다." />)
    expect(screen.getByText(/학교급식 한 끼 기준 약 800kcal보다 많습니다/)).toBeInTheDocument()
    expect(screen.getAllByText('380').length).toBeGreaterThan(0) // 원래 합계 그대로(경고가 값을 바꾸지 않는다)
  })
})
