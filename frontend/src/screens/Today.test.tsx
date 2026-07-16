import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Today from './Today'
import type { TodayArticle } from '../api/types'

function makeTodayArticle(id: string, title: string): TodayArticle {
  return {
    id,
    title,
    translatedTitle: null,
    sourceName: '요즘IT',
    sourceType: 'expert_article',
    contentType: 'article',
    publishedAt: '2026-07-14T03:00:00Z',
    interestTags: [{ id: 'interest-1', name: 'IT·개발' }],
    officialExcerpt: '원출처가 제공한 소개문',
    translatedExcerpt: null,
    thumbnailUrl: null,
    readingTimeMinutes: 5,
    language: 'ko',
    accessType: 'free',
    originalUrl: `https://example.com/${id}`,
    recommendationReason: 'IT·개발 관심사와 맞는 글이에요.',
  }
}

const ARTICLE_A = makeTodayArticle('40000000-0000-0000-0000-000000000001', 'A 글')
const ARTICLE_B = makeTodayArticle('40000000-0000-0000-0000-000000000002', 'B 글')

describe('Today', () => {
  it('renders loading state', () => {
    render(<Today state={{ status: 'loading' }} />)
    expect(screen.getByText(/불러오고/)).toBeInTheDocument()
  })

  it('renders retryable error state', async () => {
    const onRetry = vi.fn()
    render(<Today state={{ status: 'error', message: '불러오지 못했어요.', onRetry }} />)
    await userEvent.click(screen.getByRole('button', { name: /다시 시도/ }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders empty state message when items are empty', () => {
    render(<Today state={{ status: 'success', items: [], emptyStateMessage: '준비 중이에요.' }} />)
    expect(screen.getByText('준비 중이에요.')).toBeInTheDocument()
  })

  it('renders feature first and compact remaining cards in API order', () => {
    render(
      <Today state={{ status: 'success', items: [ARTICLE_B, ARTICLE_A], emptyStateMessage: null }} />,
    )
    const cards = screen.getAllByRole('article')
    expect(cards[0]).toHaveTextContent(ARTICLE_B.title)
    expect(cards[1]).toHaveTextContent(ARTICLE_A.title)
  })

  it('uses originalUrl as an external link', () => {
    render(<Today state={{ status: 'success', items: [ARTICLE_A], emptyStateMessage: null }} />)
    expect(screen.getByRole('link', { name: /읽고 미션 받기/ })).toHaveAttribute(
      'href',
      ARTICLE_A.originalUrl,
    )
  })
})
