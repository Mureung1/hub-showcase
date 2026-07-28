// T0.6 — 5곳(성별/활동량, 분석 모드, 달력 상태, AI 식습관 분석 기간, 식사 시간대)이 공유하는
// SegmentedControl. 어느 화면도 원래 role="radiogroup"/aria-checked가 없었다는 게 이관의 핵심
// 동기라, 그 접근성 계약과 옵션별 activeColor/renderCaption을 여기서 고정한다.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SegmentedControl from './SegmentedControl.jsx'

const OPTIONS = [
  { key: 'a', label: 'A' },
  { key: 'b', label: 'B' },
]

describe('SegmentedControl', () => {
  it('role=radiogroup 안에 role=radio가 옵션 수만큼 있고, 선택된 것만 aria-checked=true다', () => {
    render(<SegmentedControl options={OPTIONS} value="a" onChange={() => {}} />)

    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(2)
    expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'B' })).toHaveAttribute('aria-checked', 'false')
  })

  it('옵션을 클릭하면 그 key로 onChange가 불린다', () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={OPTIONS} value="a" onChange={onChange} />)

    fireEvent.click(screen.getByRole('radio', { name: 'B' }))
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('disabled면 모든 옵션이 비활성화된다', () => {
    render(<SegmentedControl options={OPTIONS} value="a" onChange={() => {}} disabled />)

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled()
    }
  })

  it('옵션별 activeColor가 있으면(달력 좋음/보통/나쁨) 선택됐을 때 그 색을 쓴다', () => {
    const options = [
      { key: 'good', label: '좋음', activeColor: '#059669' },
      { key: 'bad', label: '나쁨', activeColor: '#F04452' },
    ]
    render(<SegmentedControl options={options} value="bad" onChange={() => {}} />)

    expect(screen.getByRole('radio', { name: '나쁨' })).toHaveStyle({ background: '#F04452' })
  })

  it('renderCaption이 있으면(식사 시간대의 "추천") 선택된 옵션이 아니어도 옵션별로 렌더된다', () => {
    render(
      <SegmentedControl
        options={OPTIONS}
        value="a"
        onChange={() => {}}
        renderCaption={(opt) => (opt.key === 'b' ? '추천' : null)}
      />,
    )

    expect(screen.getByText('추천')).toBeInTheDocument()
  })

  it('radius를 주면(학생/직원 토글의 pill) 기본 radius.sm 대신 그 값을 쓴다', () => {
    render(<SegmentedControl options={OPTIONS} value="a" onChange={() => {}} radius="999px" />)

    expect(screen.getByRole('radio', { name: 'A' })).toHaveStyle({ borderRadius: '999px' })
  })

  it('옵션별 ring이 있으면(급식 요일 탭의 "오늘") 비활성 상태에서만 테두리가 생기고 선택되면 사라진다', () => {
    const options = [
      { key: 'a', label: 'A', ring: true },
      { key: 'b', label: 'B' },
    ]
    const { rerender } = render(<SegmentedControl options={options} value="b" onChange={() => {}} />)

    expect(screen.getByRole('radio', { name: 'A' })).toHaveStyle({ border: '1px solid #059669' })
    expect(screen.getByRole('radio', { name: 'B' })).toHaveStyle({ borderStyle: 'none' })

    rerender(<SegmentedControl options={options} value="a" onChange={() => {}} />)
    expect(screen.getByRole('radio', { name: 'A' })).toHaveStyle({ borderStyle: 'none' })
  })

  it('inactiveBg/inactiveBorder를 주면 비활성 옵션의 배경·테두리가 그 값을 쓴다', () => {
    render(
      <SegmentedControl
        options={OPTIONS}
        value="a"
        onChange={() => {}}
        inactiveBg="transparent"
        inactiveBorder="1px solid #E5E8EB"
      />,
    )

    expect(screen.getByRole('radio', { name: 'B' })).toHaveStyle({
      background: 'transparent',
      border: '1px solid #E5E8EB',
    })
  })
})
