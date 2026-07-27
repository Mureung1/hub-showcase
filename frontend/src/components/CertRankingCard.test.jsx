import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import CertRankingCard from './CertRankingCard.jsx'

const baseProps = {
  certificationName: '정보처리기사',
  issuer: '한국산업인력공단',
  mentionCount: 5,
  totalPostingCount: 31,
  mentionRatePercent: 16.1,
  emphasis: 'ESSENTIAL',
  rank: 1,
  topRelativePercent: 100,
}

describe('CertRankingCard', () => {
  test('1위 + 언급 있음: 순위, 최다 언급 문구, 필수 태그, 진행바 100%가 표시된다', () => {
    const { container } = render(<CertRankingCard {...baseProps} />)

    expect(screen.getByText('1위')).toBeInTheDocument()
    expect(screen.getByText('이 직무에서 가장 많이 언급됨')).toBeInTheDocument()
    expect(screen.getByText('필수')).toBeInTheDocument()
    expect(container.querySelector('.cert-card')).toHaveClass('cert-card--essential')
    expect(container.querySelector('.cert-card__bar-fill')).toHaveStyle({ width: '100%' })
  })

  test('2위 이하 + 언급 있음: 1위 대비 비율 문구가 표시된다', () => {
    render(<CertRankingCard {...baseProps} rank={2} mentionCount={1} topRelativePercent={20} />)

    expect(screen.getByText('2위')).toBeInTheDocument()
    expect(screen.getByText('1위 대비 20%')).toBeInTheDocument()
  })

  test('언급 0건: 상대비교 문구가 렌더링되지 않는다', () => {
    render(
      <CertRankingCard
        {...baseProps}
        rank={3}
        mentionCount={0}
        emphasis="LOW"
        topRelativePercent={0}
      />,
    )

    expect(screen.queryByText(/대비/)).not.toBeInTheDocument()
    expect(screen.queryByText('이 직무에서 가장 많이 언급됨')).not.toBeInTheDocument()
    expect(screen.getByText('언급 적음')).toBeInTheDocument()
  })

  test('강조도 PREFERRED: 우대 태그와 클래스가 표시된다', () => {
    const { container } = render(<CertRankingCard {...baseProps} emphasis="PREFERRED" />)

    expect(screen.getByText('우대')).toBeInTheDocument()
    expect(container.querySelector('.cert-card')).toHaveClass('cert-card--preferred')
  })

  test('기초 정보(건수·비율·발급기관)가 그대로 표시된다', () => {
    render(<CertRankingCard {...baseProps} />)

    expect(screen.getByText('정보처리기사')).toBeInTheDocument()
    expect(screen.getByText(/공고 31건 중 5건\(16\.1%\) · 한국산업인력공단/)).toBeInTheDocument()
  })

  test('topRelativePercent가 소수(16.7)여도 그대로 표시된다', () => {
    render(
      <CertRankingCard {...baseProps} rank={2} mentionCount={1} topRelativePercent={16.7} />,
    )

    expect(screen.getByText('1위 대비 16.7%')).toBeInTheDocument()
  })
})
