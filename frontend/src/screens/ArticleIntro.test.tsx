import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ArticleIntro from './ArticleIntro'
import type { ArticleDetail } from '../api/types'

function makeArticleDetail(fields: {
  id: string
  title: string
  sourceName: string
  officialExcerpt: string | null
  readingTimeMinutes: number
  urlStatus: ArticleDetail['urlStatus']
}): ArticleDetail {
  return {
    id: fields.id,
    title: fields.title,
    translatedTitle: null,
    sourceName: fields.sourceName,
    sourceType: 'expert_article',
    contentType: 'article',
    publishedAt: '2026-07-14T03:00:00Z',
    author: null,
    officialExcerpt: fields.officialExcerpt,
    translatedExcerpt: null,
    readingTimeMinutes: fields.readingTimeMinutes,
    language: 'ko',
    accessType: 'free',
    urlStatus: fields.urlStatus,
    originalUrl: `https://example.com/${fields.id}`,
    recommendedMission: { type: 'connection', prompt: '내 상황이나 프로젝트와 연결해보면?' },
    missionOptions: [
      { type: 'question', prompt: '이 글의 핵심 주장은 뭐지?' },
      { type: 'rebuttal', prompt: '이 주장에 반대한다면?' },
      { type: 'connection', prompt: '내 상황이나 프로젝트와 연결해보면?' },
      { type: 'expression', prompt: '이 글이 놓친 관점은 뭐지?' },
    ],
  }
}

const ARTICLE = makeArticleDetail({
  id: '40000000-0000-0000-0000-000000000001',
  title: 'A 글',
  sourceName: '요즘IT',
  officialExcerpt: 'A 글의 소개문',
  readingTimeMinutes: 5,
  urlStatus: 'active',
})

describe('ArticleIntro', () => {
  it('renders loading state', () => {
    render(<ArticleIntro state={{ status: 'loading' }} onBack={vi.fn()} />)
    expect(screen.getByText(/글을 불러오고 있어요/)).toBeInTheDocument()
  })

  it('renders retryable error state', async () => {
    const onRetry = vi.fn()
    render(
      <ArticleIntro
        state={{ status: 'error', message: '글을 불러오지 못했어요.', onRetry }}
        onBack={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /다시 시도/ }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows title, source, reading time, and officialExcerpt on success', () => {
    render(<ArticleIntro state={{ status: 'success', article: ARTICLE }} onBack={vi.fn()} />)

    expect(screen.getByText(ARTICLE.title)).toBeInTheDocument()
    expect(screen.getByText(ARTICLE.sourceName)).toBeInTheDocument()
    expect(screen.getByText(/5분/)).toBeInTheDocument()
    expect(screen.getByText(ARTICLE.officialExcerpt as string)).toBeInTheDocument()
  })

  it('shows an active original link with the correct href, target, and rel', () => {
    render(<ArticleIntro state={{ status: 'success', article: ARTICLE }} onBack={vi.fn()} />)

    const link = screen.getByRole('link', { name: /원문 읽으러 가기/ })
    expect(link).toHaveAttribute('href', ARTICLE.originalUrl)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
  })

  it('shows a fallback message when officialExcerpt is null', () => {
    const articleWithoutExcerpt = makeArticleDetail({
      id: ARTICLE.id,
      title: ARTICLE.title,
      sourceName: ARTICLE.sourceName,
      officialExcerpt: null,
      readingTimeMinutes: 5,
      urlStatus: 'active',
    })
    render(
      <ArticleIntro state={{ status: 'success', article: articleWithoutExcerpt }} onBack={vi.fn()} />,
    )

    expect(screen.getByText('제공된 글 소개가 없어요.')).toBeInTheDocument()
  })

  it('shows a paywalled notice and disables the CTA', () => {
    const paywalled = makeArticleDetail({
      id: ARTICLE.id,
      title: ARTICLE.title,
      sourceName: ARTICLE.sourceName,
      officialExcerpt: ARTICLE.officialExcerpt,
      readingTimeMinutes: 5,
      urlStatus: 'paywalled',
    })
    render(<ArticleIntro state={{ status: 'success', article: paywalled }} onBack={vi.fn()} />)

    expect(screen.getByText(/유료 콘텐츠/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /원문 읽으러 가기/ })).toBeDisabled()
    expect(screen.queryByRole('link', { name: /원문 읽으러 가기/ })).not.toBeInTheDocument()
  })

  it('shows a broken link notice and disables the CTA', () => {
    const broken = makeArticleDetail({
      id: ARTICLE.id,
      title: ARTICLE.title,
      sourceName: ARTICLE.sourceName,
      officialExcerpt: ARTICLE.officialExcerpt,
      readingTimeMinutes: 5,
      urlStatus: 'broken',
    })
    render(<ArticleIntro state={{ status: 'success', article: broken }} onBack={vi.fn()} />)

    expect(screen.getByText(/링크에 문제/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /원문 읽으러 가기/ })).toBeDisabled()
  })

  it('shows a removed article notice and disables the CTA', () => {
    const removed = makeArticleDetail({
      id: ARTICLE.id,
      title: ARTICLE.title,
      sourceName: ARTICLE.sourceName,
      officialExcerpt: ARTICLE.officialExcerpt,
      readingTimeMinutes: 5,
      urlStatus: 'removed',
    })
    render(<ArticleIntro state={{ status: 'success', article: removed }} onBack={vi.fn()} />)

    expect(screen.getByText(/삭제/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /원문 읽으러 가기/ })).toBeDisabled()
  })

  it('goes back to today when the back button is clicked', async () => {
    const onBack = vi.fn()
    render(<ArticleIntro state={{ status: 'success', article: ARTICLE }} onBack={onBack} />)

    await userEvent.click(screen.getByRole('button', { name: /뒤로가기/ }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('does not render body, sentence list, AI summary, or mission input UI', () => {
    render(<ArticleIntro state={{ status: 'success', article: ARTICLE }} onBack={vi.fn()} />)

    expect(screen.queryByText(/AI 요약/)).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByText(ARTICLE.recommendedMission.prompt)).not.toBeInTheDocument()
    ARTICLE.missionOptions.forEach((option) => {
      expect(screen.queryByText(option.prompt)).not.toBeInTheDocument()
    })
  })
})
