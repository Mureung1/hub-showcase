import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import CustomComboBuilder from './CustomComboBuilder.jsx'
import { fetchFoodItems } from '../lib/foodItemsApi.js'

vi.mock('../lib/foodItemsApi.js', () => ({ fetchFoodItems: vi.fn() }))

function riceItem(name = '흰쌀밥') {
  return { name, baseQuantity: 100, servSize: 210, foodSize: null, brand: null, nutrients: { calories: 130, protein: 2.5, carbs: 28, fat: 0.3, fiber: 0.3, sodium: 1 } }
}

describe('CustomComboBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 베이스 그룹은 rice+noodle 두 카테고리를 병렬 조회해 합친다 — 카테고리별로 다른 결과를 줘야
    // "흰쌀밥"이 중복 렌더되지 않는다(실제 DB도 같은 이름이 여러 카테고리에 겹치지 않는다).
    fetchFoodItems.mockImplementation(({ category }) => Promise.resolve(category === 'rice' ? [riceItem()] : []))
  })

  it('마운트 시 기본 그룹(베이스)의 재료 목록을 불러와 렌더한다', async () => {
    render(<CustomComboBuilder onComplete={() => {}} />)
    await waitFor(() => expect(screen.getByText('흰쌀밥')).toBeInTheDocument())
    expect(fetchFoodItems).toHaveBeenCalledWith(expect.objectContaining({ category: 'rice' }))
    expect(fetchFoodItems).toHaveBeenCalledWith(expect.objectContaining({ category: 'noodle' }))
  })

  it('재료를 담으면 "담은 재료" 목록과 영양 합산 미리보기가 나타나고 완료 버튼이 활성화된다', async () => {
    render(<CustomComboBuilder onComplete={() => {}} />)
    const addButton = await screen.findByText('담기 +')
    fireEvent.click(addButton)

    expect(await screen.findByText('담은 재료')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '완료' })).not.toBeDisabled()
  })

  it('수량을 늘리고 줄일 수 있고, 0이 되면 목록에서 사라진다', async () => {
    render(<CustomComboBuilder onComplete={() => {}} />)
    fireEvent.click(await screen.findByText('담기 +'))
    await screen.findByText('담은 재료')

    fireEvent.click(screen.getByLabelText('흰쌀밥 수량 늘리기'))
    expect(screen.getByText('2')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('흰쌀밥 수량 줄이기'))
    fireEvent.click(screen.getByLabelText('흰쌀밥 수량 줄이기'))
    await waitFor(() => expect(screen.queryByText('담은 재료')).not.toBeInTheDocument())
  })

  it('완료를 누르면 담은 재료를 합산한 분석 결과로 onComplete를 호출한다', async () => {
    const onComplete = vi.fn()
    render(<CustomComboBuilder onComplete={onComplete} />)
    fireEvent.click(await screen.findByText('담기 +'))
    await screen.findByText('담은 재료')

    fireEvent.click(screen.getByRole('button', { name: '완료' }))

    expect(onComplete).toHaveBeenCalledTimes(1)
    const analysis = onComplete.mock.calls[0][0]
    expect(analysis.items).toHaveLength(1)
    expect(analysis.items[0].name).toBe('흰쌀밥')
    expect(analysis.total.calories).toBeGreaterThan(0)
  })

  it('아무것도 담지 않으면 완료 버튼이 비활성화된다', async () => {
    render(<CustomComboBuilder onComplete={() => {}} />)
    await waitFor(() => expect(screen.getByText('흰쌀밥')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: '완료' })).toBeDisabled()
  })

  it('그룹을 바꾸면 해당 그룹의 카테고리로 다시 조회한다', async () => {
    render(<CustomComboBuilder onComplete={() => {}} />)
    await waitFor(() => expect(fetchFoodItems).toHaveBeenCalled())
    vi.clearAllMocks()
    fetchFoodItems.mockResolvedValue([])

    fireEvent.click(screen.getByRole('radio', { name: '토핑' }))

    await waitFor(() => expect(fetchFoodItems).toHaveBeenCalledWith(expect.objectContaining({ category: 'main' })))
    expect(fetchFoodItems).toHaveBeenCalledWith(expect.objectContaining({ category: 'side' }))
    expect(fetchFoodItems).toHaveBeenCalledWith(expect.objectContaining({ category: 'kimchi' }))
    expect(fetchFoodItems).toHaveBeenCalledWith(expect.objectContaining({ category: 'dessert' }))
  })
})
