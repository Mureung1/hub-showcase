import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import SchoolSearchField from './SchoolSearchField.jsx'

vi.mock('../lib/schoolMeal.js', () => ({
  searchSchools: vi.fn(),
}))

import { searchSchools } from '../lib/schoolMeal.js'

const PLACEHOLDER = '학교명 검색 (예: 양서고등학교)'

describe('SchoolSearchField', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    searchSchools.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('타이핑 멈춘 뒤 300ms 후에만 검색을 1회 호출한다', async () => {
    searchSchools.mockResolvedValue([
      { name: '양서고등학교', officeCode: 'J10', schoolCode: '7530588', kind: '고등학교' },
    ])
    render(<SchoolSearchField onSelect={() => {}} />)
    const input = screen.getByPlaceholderText(PLACEHOLDER)

    fireEvent.change(input, { target: { value: '양' } })
    await act(async () => vi.advanceTimersByTimeAsync(100))
    fireEvent.change(input, { target: { value: '양서' } })
    await act(async () => vi.advanceTimersByTimeAsync(100))
    fireEvent.change(input, { target: { value: '양서고' } })

    expect(searchSchools).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersByTimeAsync(300))

    expect(searchSchools).toHaveBeenCalledTimes(1)
    expect(searchSchools).toHaveBeenCalledWith('양서고', expect.anything())
    expect(screen.getByText(/양서고등학교/)).toBeInTheDocument()
  })

  it('결과가 없으면 안내 문구를 보여준다', async () => {
    searchSchools.mockResolvedValue([])
    render(<SchoolSearchField onSelect={() => {}} />)
    const input = screen.getByPlaceholderText(PLACEHOLDER)

    fireEvent.change(input, { target: { value: 'ㅁㄴㅇㄹ' } })
    await act(async () => vi.advanceTimersByTimeAsync(300))

    expect(screen.getByText('검색 결과가 없어요. 학교명을 다시 확인해주세요.')).toBeInTheDocument()
  })

  it('2자 미만이면 검색을 호출하지 않는다', async () => {
    render(<SchoolSearchField onSelect={() => {}} />)
    const input = screen.getByPlaceholderText(PLACEHOLDER)

    fireEvent.change(input, { target: { value: '양' } })
    await act(async () => vi.advanceTimersByTimeAsync(500))

    expect(searchSchools).not.toHaveBeenCalled()
  })

  it('결과를 선택하면 onSelect가 호출되고 입력창이 비워진다', async () => {
    searchSchools.mockResolvedValue([
      { name: '양서고등학교', officeCode: 'J10', schoolCode: '7530588', kind: '고등학교' },
    ])
    const onSelect = vi.fn()
    render(<SchoolSearchField onSelect={onSelect} />)
    const input = screen.getByPlaceholderText(PLACEHOLDER)

    fireEvent.change(input, { target: { value: '양서고' } })
    await act(async () => vi.advanceTimersByTimeAsync(300))

    fireEvent.click(screen.getByText(/양서고등학교/))

    expect(onSelect).toHaveBeenCalledWith({
      name: '양서고등학교',
      officeCode: 'J10',
      schoolCode: '7530588',
      kind: '고등학교',
    })
    expect(input.value).toBe('')
  })
})
