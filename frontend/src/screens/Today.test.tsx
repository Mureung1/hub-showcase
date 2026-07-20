import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Today from './Today'
import type { TodayArticle } from '../api/types'

function makeTodayArticle(fields: {
  id: string
  title: string
  sourceName: string
  officialExcerpt: string
  readingTimeMinutes: number
}): TodayArticle {
  return {
    id: fields.id,
    title: fields.title,
    translatedTitle: null,
    sourceName: fields.sourceName,
    sourceType: 'expert_article',
    contentType: 'article',
    publishedAt: '2026-07-14T03:00:00Z',
    interestTags: [{ id: 'interest-1', name: 'IT·개발' }],
    officialExcerpt: fields.officialExcerpt,
    translatedExcerpt: null,
    thumbnailUrl: null,
    readingTimeMinutes: fields.readingTimeMinutes,
    language: 'ko',
    accessType: 'free',
    originalUrl: `https://example.com/${fields.id}`,
    recommendationReason: 'IT·개발 관심사와 맞는 글이에요.',
  }
}

const ARTICLE_A = makeTodayArticle({
  id: '40000000-0000-0000-0000-000000000001',
  title: 'A 글',
  sourceName: '요즘IT',
  officialExcerpt: 'A 글의 소개문',
  readingTimeMinutes: 5,
})
const ARTICLE_B = makeTodayArticle({
  id: '40000000-0000-0000-0000-000000000002',
  title: 'B 글',
  sourceName: 'Toss Tech',
  officialExcerpt: 'B 글의 소개문',
  readingTimeMinutes: 8,
})
const ARTICLE_C = makeTodayArticle({
  id: '40000000-0000-0000-0000-000000000003',
  title: 'C 글',
  sourceName: '커리어리',
  officialExcerpt: 'C 글의 소개문',
  readingTimeMinutes: 3,
})

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

  it('promotes a selected compact card to the feature card', async () => {
    render(
      <Today
        state={{ status: 'success', items: [ARTICLE_A, ARTICLE_B, ARTICLE_C], emptyStateMessage: null }}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: new RegExp(ARTICLE_B.title) }))

    expect(screen.getByRole('link', { name: /읽고 미션 받기/ })).toHaveAttribute(
      'href',
      ARTICLE_B.originalUrl,
    )
  })

  it('demotes the previous feature article to the compact list in API order after selecting B', async () => {
    const { container } = render(
      <Today
        state={{ status: 'success', items: [ARTICLE_A, ARTICLE_B, ARTICLE_C], emptyStateMessage: null }}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: new RegExp(ARTICLE_B.title) }))

    const compactButtons = within(container.querySelector('.today-more-list') as HTMLElement).getAllByRole(
      'button',
    )
    expect(compactButtons).toHaveLength(2)
    expect(compactButtons[0]).toHaveAccessibleName(new RegExp(ARTICLE_A.title))
    expect(compactButtons[1]).toHaveAccessibleName(new RegExp(ARTICLE_C.title))
  })

  it('updates all feature card fields to the selected article after selecting B', async () => {
    render(
      <Today
        state={{ status: 'success', items: [ARTICLE_A, ARTICLE_B, ARTICLE_C], emptyStateMessage: null }}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: new RegExp(ARTICLE_B.title) }))

    const featureCard = screen.getAllByRole('article')[0]
    expect(featureCard).toHaveTextContent(ARTICLE_B.title)
    expect(featureCard).toHaveTextContent(ARTICLE_B.sourceName)
    expect(featureCard).toHaveTextContent(ARTICLE_B.officialExcerpt as string)
    expect(featureCard).toHaveTextContent(`${ARTICLE_B.readingTimeMinutes}분`)
    expect(screen.getByRole('link', { name: /읽고 미션 받기/ })).toHaveAttribute(
      'href',
      ARTICLE_B.originalUrl,
    )
  })

  it('re-selecting C after B makes C the feature and leaves A and B in compact', async () => {
    const { container } = render(
      <Today
        state={{ status: 'success', items: [ARTICLE_A, ARTICLE_B, ARTICLE_C], emptyStateMessage: null }}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: new RegExp(ARTICLE_B.title) }))
    await userEvent.click(screen.getByRole('button', { name: new RegExp(ARTICLE_C.title) }))

    const featureCard = screen.getAllByRole('article')[0]
    expect(featureCard).toHaveTextContent(ARTICLE_C.title)

    const compactButtons = within(container.querySelector('.today-more-list') as HTMLElement).getAllByRole(
      'button',
    )
    expect(compactButtons).toHaveLength(2)
    expect(compactButtons[0]).toHaveAccessibleName(new RegExp(ARTICLE_A.title))
    expect(compactButtons[1]).toHaveAccessibleName(new RegExp(ARTICLE_B.title))
  })

  it('never loses or duplicates articles across multiple selections', async () => {
    render(
      <Today
        state={{ status: 'success', items: [ARTICLE_A, ARTICLE_B, ARTICLE_C], emptyStateMessage: null }}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: new RegExp(ARTICLE_B.title) }))
    await userEvent.click(screen.getByRole('button', { name: new RegExp(ARTICLE_A.title) }))
    await userEvent.click(screen.getByRole('button', { name: new RegExp(ARTICLE_C.title) }))

    const allCards = screen.getAllByRole('article')
    const titles = allCards.map((card) => card.textContent)
    expect(allCards).toHaveLength(3)
    expect(titles.filter((text) => text?.includes(ARTICLE_A.title))).toHaveLength(1)
    expect(titles.filter((text) => text?.includes(ARTICLE_B.title))).toHaveLength(1)
    expect(titles.filter((text) => text?.includes(ARTICLE_C.title))).toHaveLength(1)
  })

  it('selecting a compact card does not trigger external link navigation', async () => {
    const anchorClick = vi.fn()
    render(
      <Today
        state={{ status: 'success', items: [ARTICLE_A, ARTICLE_B, ARTICLE_C], emptyStateMessage: null }}
      />,
    )

    const anchor = screen.getByRole('link', { name: /읽고 미션 받기/ })
    anchor.addEventListener('click', anchorClick)

    await userEvent.click(screen.getByRole('button', { name: new RegExp(ARTICLE_B.title) }))

    expect(anchorClick).not.toHaveBeenCalled()
  })

  it('selects a compact card with the Enter key', async () => {
    render(
      <Today
        state={{ status: 'success', items: [ARTICLE_A, ARTICLE_B, ARTICLE_C], emptyStateMessage: null }}
      />,
    )

    const compactButton = screen.getByRole('button', { name: new RegExp(ARTICLE_B.title) })
    compactButton.focus()
    await userEvent.keyboard('{Enter}')

    expect(screen.getByRole('link', { name: /읽고 미션 받기/ })).toHaveAttribute(
      'href',
      ARTICLE_B.originalUrl,
    )
  })

  it('selects a compact card with the Space key', async () => {
    render(
      <Today
        state={{ status: 'success', items: [ARTICLE_A, ARTICLE_B, ARTICLE_C], emptyStateMessage: null }}
      />,
    )

    const compactButton = screen.getByRole('button', { name: new RegExp(ARTICLE_B.title) })
    compactButton.focus()
    await userEvent.keyboard(' ')

    expect(screen.getByRole('link', { name: /읽고 미션 받기/ })).toHaveAttribute(
      'href',
      ARTICLE_B.originalUrl,
    )
  })

  it('shows only the feature card when there is 1 article', () => {
    render(<Today state={{ status: 'success', items: [ARTICLE_A], emptyStateMessage: null }} />)
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.queryByText('이런 글도 있어요')).not.toBeInTheDocument()
  })

  it('shows 1 feature and 1 compact card when there are 2 articles', () => {
    const { container } = render(
      <Today state={{ status: 'success', items: [ARTICLE_A, ARTICLE_B], emptyStateMessage: null }} />,
    )
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(
      within(container.querySelector('.today-more-list') as HTMLElement).getAllByRole('button'),
    ).toHaveLength(1)
  })

  it('shows 1 feature and 2 compact cards when there are 3 articles', () => {
    const { container } = render(
      <Today
        state={{ status: 'success', items: [ARTICLE_A, ARTICLE_B, ARTICLE_C], emptyStateMessage: null }}
      />,
    )
    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(
      within(container.querySelector('.today-more-list') as HTMLElement).getAllByRole('button'),
    ).toHaveLength(2)
  })
})
