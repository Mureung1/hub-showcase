// AnalysisResultCard(트랙 2 §4)와 MealsPage(트랙 2 §5)가 공유하는 폼이라, 어느 한쪽 조립 방식과
// 무관하게 이 컴포넌트 자체의 계약(초깃값 채움 · 빈 값 보호 · 취소)만 독립적으로 고정한다.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NutrientEditForm from './NutrientEditForm.jsx'

const NUTRIENTS = { calories: 300, protein: 6, carbs: 65, fat: 1, fiber: 3, sodium: 5 }

describe('NutrientEditForm', () => {
  it('전달받은 값으로 입력칸을 채운다', () => {
    render(<NutrientEditForm nutrients={NUTRIENTS} onCancel={() => {}} onSave={() => {}} />)
    expect(screen.getByLabelText('칼로리')).toHaveValue(300)
    expect(screen.getByLabelText('나트륨')).toHaveValue(5)
  })

  it('적용을 누르면 고친 값 그대로 onSave에 넘어간다', () => {
    const onSave = vi.fn()
    render(<NutrientEditForm nutrients={NUTRIENTS} onCancel={() => {}} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('단백질'), { target: { value: '10' } })
    fireEvent.click(screen.getByText('적용'))

    expect(onSave).toHaveBeenCalledWith({ ...NUTRIENTS, protein: 10 })
  })

  it('음수를 입력하면 그 항목만 원래 값으로 되돌아간다', () => {
    const onSave = vi.fn()
    render(<NutrientEditForm nutrients={NUTRIENTS} onCancel={() => {}} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('지방'), { target: { value: '-5' } })
    fireEvent.click(screen.getByText('적용'))

    expect(onSave).toHaveBeenCalledWith(NUTRIENTS)
  })

  it('취소를 누르면 onSave 없이 onCancel만 불린다', () => {
    const onCancel = vi.fn()
    const onSave = vi.fn()
    render(<NutrientEditForm nutrients={NUTRIENTS} onCancel={onCancel} onSave={onSave} />)

    fireEvent.click(screen.getByText('취소'))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
  })
})
