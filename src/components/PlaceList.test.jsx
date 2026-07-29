import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PlaceList from './PlaceList.jsx'

function place(overrides = {}) {
  return {
    place_name: '테스트식당',
    road_address_name: '대전 유성구 어딘가로 1',
    category_name: '음식점 > 한식',
    place_url: 'https://map.naver.com/p/test',
    distance: 300,
    ...overrides,
  }
}

describe('PlaceList', () => {
  it('selectable을 생략하면 체크박스가 렌더되지 않는다(기존 동작 유지)', () => {
    render(<PlaceList places={[place()]} />)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('selectable이면 카드마다 체크박스가 렌더되고, 클릭 시 onToggleSelect가 호출된다', () => {
    const onToggleSelect = vi.fn()
    render(
      <PlaceList
        places={[place({ place_name: 'A식당', place_url: 'url-a' }), place({ place_name: 'B식당', place_url: 'url-b' })]}
        selectable
        selectedKeys={['url-a']}
        onToggleSelect={onToggleSelect}
      />,
    )
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(2)
    expect(checkboxes[0]).toBeChecked()
    expect(checkboxes[1]).not.toBeChecked()

    fireEvent.click(checkboxes[1])
    expect(onToggleSelect).toHaveBeenCalledWith('url-b')
  })
})
