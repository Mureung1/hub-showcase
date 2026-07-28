// 트랙 3 §2 — 알레르기 교차 경고. 기존 표시(알레르기 범례·영양 정보 등)를 건드리지 않고, 프로필
// 알레르기와 겹치는 메뉴가 있을 때만 카드 상단 배너 + 메뉴별 표시가 추가되는지 확인한다.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MealCard from './MealCard.jsx'

const MENUS_WITH_MILK = [
  { name: '우유', allergyCodes: ['M2'] },
  { name: '흰쌀밥', allergyCodes: [] },
]

describe('MealCard — 알레르기 교차 경고', () => {
  it('profileAllergies를 안 넘기면(기존 호출부와 동일) 경고가 전혀 안 뜬다', () => {
    render(<MealCard title="중식" menus={MENUS_WITH_MILK} layout="numbered" />)
    expect(screen.queryByText(/등록한 알레르기/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('알레르기 주의')).not.toBeInTheDocument()
  })

  it('겹치는 알레르기가 없으면 경고가 없다("안전"이라고도 말하지 않는다)', () => {
    render(<MealCard title="중식" menus={MENUS_WITH_MILK} layout="numbered" profileAllergies={['peanut']} />)
    expect(screen.queryByText(/등록한 알레르기/)).not.toBeInTheDocument()
    expect(screen.queryByText(/안전/)).not.toBeInTheDocument()
  })

  it('겹치면(numbered 레이아웃) 상단 배너와 메뉴별 표시가 함께 뜬다', () => {
    render(<MealCard title="중식" menus={MENUS_WITH_MILK} layout="numbered" profileAllergies={['milk']} />)
    expect(screen.getByText(/등록한 알레르기\(우유\)가 포함된 메뉴가 있어요/)).toBeInTheDocument()
    expect(screen.getByLabelText('알레르기 주의')).toBeInTheDocument()
  })

  it('겹치면(stacked 레이아웃, 급식) 메뉴 이름 옆에도 표시된다', () => {
    render(<MealCard title="중식" menus={MENUS_WITH_MILK} layout="stacked" profileAllergies={['milk']} />)
    expect(screen.getByText(/등록한 알레르기\(우유\)가 포함된 메뉴가 있어요/)).toBeInTheDocument()
    expect(screen.getByLabelText('알레르기 주의')).toBeInTheDocument()
  })

  it('estimated(학식)면 배너에 실제 재료 확인 문구가 추가된다', () => {
    render(<MealCard title="학생회관" menus={MENUS_WITH_MILK} layout="numbered" profileAllergies={['milk']} estimated />)
    expect(screen.getByText(/실제 재료를 꼭 확인하세요/)).toBeInTheDocument()
  })

  it('estimated가 아니면(급식 공식 정보) 재료 확인 문구가 없다', () => {
    render(<MealCard title="중식" menus={MENUS_WITH_MILK} layout="numbered" profileAllergies={['milk']} estimated={false} />)
    expect(screen.queryByText(/실제 재료를 꼭 확인하세요/)).not.toBeInTheDocument()
  })

  it('자유 입력 알레르기도 대조된다', () => {
    const menus = [{ name: '고등어구이', allergyCodes: ['M7'] }]
    render(<MealCard title="중식" menus={menus} layout="numbered" profileAllergies={['고등어']} />)
    expect(screen.getByText(/등록한 알레르기\(고등어\)가 포함된 메뉴가 있어요/)).toBeInTheDocument()
  })
})
