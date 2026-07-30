import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PlaceDuelModal from './PlaceDuelModal.jsx'

function place(overrides = {}) {
  return {
    place_name: 'A식당',
    representativeMenu: '제육볶음',
    priceRange: { min: 8000, max: 10000 },
    expected: { protein: 30, sodium: 800 },
    ...overrides,
  }
}

describe('PlaceDuelModal', () => {
  it('두 식당의 이름·대표메뉴·가격대와 비교 항목을 렌더한다', () => {
    render(
      <PlaceDuelModal
        placeA={place({ place_name: 'A식당' })}
        placeB={place({ place_name: 'B식당', expected: { protein: 10, sodium: 1500 } })}
        todayTotal={{}}
        recommended={{ protein: 60 }}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('A식당')).toBeInTheDocument()
    expect(screen.getByText('B식당')).toBeInTheDocument()
    expect(screen.getAllByText('제육볶음')).toHaveLength(2)
    expect(screen.getByText('단백질')).toBeInTheDocument()
    expect(screen.getByText('나트륨')).toBeInTheDocument()
  })

  it('전체 우세인 쪽을 "더 건강한 선택"으로 안내한다', () => {
    render(
      <PlaceDuelModal
        placeA={place({ place_name: 'A식당', expected: { protein: 40, sodium: 500 } })}
        placeB={place({ place_name: 'B식당', expected: { protein: 10, sodium: 1500 } })}
        todayTotal={{}}
        recommended={{ protein: 60 }}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('더 건강한 선택: A식당')).toBeInTheDocument()
  })

  it('닫기 버튼을 누르면 onClose가 호출된다', () => {
    const onClose = vi.fn()
    render(<PlaceDuelModal placeA={place()} placeB={place({ place_name: 'B식당' })} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
