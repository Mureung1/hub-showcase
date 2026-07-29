import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CustomComboBuilder from './CustomComboBuilder.jsx'
import { COMBO_INGREDIENTS } from '../data/comboIngredients.js'

// 리텐션 강화 v4 — DB 검색(/api/food-items) 대신 손수 큐레이션한 comboIngredients.js를 그대로 쓰므로
// 더 이상 fetch를 모킹할 필요가 없다(항상 동기적으로 즉시 렌더된다).
describe('CustomComboBuilder', () => {
  it('마운트 시 기본 그룹(베이스)의 재료 목록을 즉시 렌더한다', () => {
    render(<CustomComboBuilder onComplete={() => {}} />)
    for (const item of COMBO_INGREDIENTS.base) {
      expect(screen.getByText(item.name)).toBeInTheDocument()
    }
  })

  it('재료를 담으면 "담은 재료" 목록과 영양 합산 미리보기가 나타나고 완료 버튼이 활성화된다', () => {
    render(<CustomComboBuilder onComplete={() => {}} />)
    fireEvent.click(screen.getAllByText('담기 +')[0])

    expect(screen.getByText('담은 재료')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '완료' })).not.toBeDisabled()
  })

  it('수량을 늘리고 줄일 수 있고, 0이 되면 목록에서 사라진다', () => {
    render(<CustomComboBuilder onComplete={() => {}} />)
    const firstBase = COMBO_INGREDIENTS.base[0]
    fireEvent.click(screen.getAllByText('담기 +')[0])
    screen.getByText('담은 재료')

    fireEvent.click(screen.getByLabelText(`${firstBase.name} 수량 늘리기`))
    expect(screen.getByText('2')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(`${firstBase.name} 수량 줄이기`))
    fireEvent.click(screen.getByLabelText(`${firstBase.name} 수량 줄이기`))
    expect(screen.queryByText('담은 재료')).not.toBeInTheDocument()
  })

  it('완료를 누르면 담은 재료를 합산한 분석 결과로 onComplete를 호출한다', () => {
    const onComplete = vi.fn()
    render(<CustomComboBuilder onComplete={onComplete} />)
    const firstBase = COMBO_INGREDIENTS.base[0]
    fireEvent.click(screen.getAllByText('담기 +')[0])

    fireEvent.click(screen.getByRole('button', { name: '완료' }))

    expect(onComplete).toHaveBeenCalledTimes(1)
    const analysis = onComplete.mock.calls[0][0]
    expect(analysis.items).toHaveLength(1)
    expect(analysis.items[0].name).toBe(firstBase.name)
    expect(analysis.total.calories).toBeGreaterThan(0)
  })

  it('아무것도 담지 않으면 완료 버튼이 비활성화된다', () => {
    render(<CustomComboBuilder onComplete={() => {}} />)
    expect(screen.getByRole('button', { name: '완료' })).toBeDisabled()
  })

  it('그룹을 바꾸면 해당 그룹의 재료로 다시 보여준다(토핑)', () => {
    render(<CustomComboBuilder onComplete={() => {}} />)
    fireEvent.click(screen.getByRole('radio', { name: '토핑' }))

    for (const item of COMBO_INGREDIENTS.topping) {
      expect(screen.getByText(item.name)).toBeInTheDocument()
    }
    expect(screen.queryByText(COMBO_INGREDIENTS.base[0].name)).not.toBeInTheDocument()
  })

  it('"국물·음료" 그룹은 국물과 음료를 함께 보여준다', () => {
    render(<CustomComboBuilder onComplete={() => {}} />)
    fireEvent.click(screen.getByRole('radio', { name: '국물·음료' }))

    expect(screen.getByText(COMBO_INGREDIENTS.soup[0].name)).toBeInTheDocument()
    expect(screen.getByText(COMBO_INGREDIENTS.drink[0].name)).toBeInTheDocument()
  })

  it('검색어로 현재 그룹 안에서 재료 이름을 좁힐 수 있다', async () => {
    render(<CustomComboBuilder onComplete={() => {}} />)
    fireEvent.click(screen.getByRole('radio', { name: '토핑' }))
    fireEvent.change(screen.getByLabelText('재료 검색(선택)'), { target: { value: '치즈' } })

    await waitFor(() => expect(screen.getByText('슬라이스 치즈 1장')).toBeInTheDocument())
    expect(screen.queryByText('차돌박이 추가')).not.toBeInTheDocument()
  })
})
