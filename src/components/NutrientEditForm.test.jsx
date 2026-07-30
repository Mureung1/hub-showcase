// AnalysisResultCard(트랙 2 §4)와 MealsPage(트랙 2 §5)가 공유하는 폼이라, 어느 한쪽 조립 방식과
// 무관하게 이 컴포넌트 자체의 계약(초깃값 채움 · 빈 값 보호 · 취소)만 독립적으로 고정한다.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NutrientEditForm from './NutrientEditForm.jsx'

const NUTRIENTS = { calories: 300, protein: 6, carbs: 65, fat: 1, fiber: 3, sodium: 5 }

describe('NutrientEditForm', () => {
  it('전달받은 값으로 입력칸을 채운다', () => {
    render(<NutrientEditForm nutrients={NUTRIENTS} onCancel={() => {}} onSave={() => {}} />)
    // 문자열로 비교하는 이유: 입력칸이 type="number"가 아니라 type="text"+inputMode다
    // (안드로이드 웹뷰가 type=number의 value를 ''로 만들어 입력이 통째로 무시됐다 —
    //  src/lib/numericInput.js 헤더 주석). toHaveValue는 type에 따라 숫자/문자열을 돌려준다.
    expect(screen.getByLabelText('칼로리')).toHaveValue('300')
    expect(screen.getByLabelText('나트륨')).toHaveValue('5')
  })

  it('숫자 칸에 type=number를 쓰지 않는다', () => {
    render(<NutrientEditForm nutrients={NUTRIENTS} onCancel={() => {}} onSave={() => {}} />)
    const input = screen.getByLabelText('칼로리')
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveAttribute('inputmode', 'decimal')
  })

  it('적용을 누르면 고친 값 그대로 onSave에 넘어간다', () => {
    const onSave = vi.fn()
    render(<NutrientEditForm nutrients={NUTRIENTS} onCancel={() => {}} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('단백질'), { target: { value: '10' } })
    fireEvent.click(screen.getByText('적용'))

    expect(onSave).toHaveBeenCalledWith({ ...NUTRIENTS, protein: 10 })
  })

  it('음수는 애초에 입력되지 않는다', () => {
    // 예전에는 -5를 칠 수 있었고 적용을 누르면 **조용히** 원래 값으로 되돌아갔다(화면에는 -5가
    // 남은 채로). 이제 마이너스 기호가 입력 단계에서 걸러져 칸에 5가 보이고 그 5가 그대로 저장된다
    // — 보이는 것과 저장되는 것이 같아진다.
    const onSave = vi.fn()
    render(<NutrientEditForm nutrients={NUTRIENTS} onCancel={() => {}} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('지방'), { target: { value: '-5' } })
    expect(screen.getByLabelText('지방')).toHaveValue('5')

    fireEvent.click(screen.getByText('적용'))
    expect(onSave).toHaveBeenCalledWith({ ...NUTRIENTS, fat: 5 })
  })

  it('빈 칸은 여전히 원래 값으로 되돌아간다', () => {
    // handleSave의 방어선은 그대로 남아 있어야 한다 — 실수로 0을 저장하는 것보다 안전하다.
    const onSave = vi.fn()
    render(<NutrientEditForm nutrients={NUTRIENTS} onCancel={() => {}} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('지방'), { target: { value: '' } })
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
