import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { ArticleDetail, TodayArticle } from './api/types'

vi.mock('./lib/supabase', () => ({
  ensureAnonymousSession: vi.fn().mockResolvedValue({ access_token: 'token' }),
}))

vi.mock('./api/client', () => {
  class ApiClientError extends Error {
    status: number
    code: string
    constructor(status: number, body: { code: string; message: string }) {
      super(body.message)
      this.status = status
      this.code = body.code
    }
  }
  return {
    ApiClientError,
    api: {
      getUserInterests: vi.fn(),
      getInterests: vi.fn(),
      replaceUserInterests: vi.fn(),
      getTodayArticles: vi.fn().mockResolvedValue({ items: [], emptyStateMessage: null }),
      getArticleDetail: vi.fn(),
      createMissionRecord: vi.fn(),
    },
  }
})

import { api } from './api/client'

const ARTICLE_A: TodayArticle = {
  id: '40000000-0000-0000-0000-000000000001',
  title: 'A 글',
  translatedTitle: null,
  sourceName: '요즘IT',
  sourceType: 'expert_article',
  contentType: 'article',
  publishedAt: '2026-07-14T03:00:00Z',
  interestTags: [{ id: 'interest-1', name: 'IT·개발' }],
  officialExcerpt: 'A 글의 소개문',
  translatedExcerpt: null,
  thumbnailUrl: null,
  readingTimeMinutes: 5,
  language: 'ko',
  accessType: 'free',
  originalUrl: 'https://example.com/40000000-0000-0000-0000-000000000001',
  recommendationReason: 'IT·개발 관심사와 맞는 글이에요.',
}

const ARTICLE_B: TodayArticle = {
  id: '40000000-0000-0000-0000-000000000002',
  title: 'B 글',
  translatedTitle: null,
  sourceName: 'Toss Tech',
  sourceType: 'official_blog',
  contentType: 'blog',
  publishedAt: '2026-07-14T03:00:00Z',
  interestTags: [{ id: 'interest-1', name: 'IT·개발' }],
  officialExcerpt: 'B 글의 소개문',
  translatedExcerpt: null,
  thumbnailUrl: null,
  readingTimeMinutes: 8,
  language: 'ko',
  accessType: 'free',
  originalUrl: 'https://example.com/40000000-0000-0000-0000-000000000002',
  recommendationReason: 'IT·개발 관심사와 맞는 글이에요.',
}

const ARTICLE_A_DETAIL: ArticleDetail = {
  id: ARTICLE_A.id,
  title: ARTICLE_A.title,
  translatedTitle: null,
  sourceName: ARTICLE_A.sourceName,
  sourceType: ARTICLE_A.sourceType,
  contentType: ARTICLE_A.contentType,
  publishedAt: ARTICLE_A.publishedAt,
  author: null,
  officialExcerpt: ARTICLE_A.officialExcerpt,
  translatedExcerpt: null,
  readingTimeMinutes: ARTICLE_A.readingTimeMinutes,
  language: 'ko',
  accessType: 'free',
  urlStatus: 'active',
  originalUrl: ARTICLE_A.originalUrl,
  recommendedMission: { type: 'connection', prompt: '내 상황이나 프로젝트와 연결해보면?' },
  missionOptions: [
    { type: 'question', prompt: '이 글의 핵심 주장은 뭐지?' },
    { type: 'rebuttal', prompt: '이 주장에 반대한다면?' },
    { type: 'connection', prompt: '내 상황이나 프로젝트와 연결해보면?' },
    { type: 'expression', prompt: '이 글이 놓친 관점은 뭐지?' },
  ],
}

describe('App startup', () => {
  beforeEach(() => {
    vi.mocked(api.getUserInterests).mockReset()
    vi.mocked(api.getInterests).mockReset()
  })

  it('shows onboarding when hasCompletedOnboarding is false', async () => {
    vi.mocked(api.getUserInterests).mockResolvedValue({
      hasCompletedOnboarding: false,
      interests: [],
    })
    vi.mocked(api.getInterests).mockResolvedValue([
      {
        id: 'interest-1',
        name: 'IT·개발',
        displayOrder: 1,
        launchStatus: 'active',
        riskLevel: 'low',
        emptyStateMessage: null,
      },
    ])
    render(<App />)
    expect(await screen.findByRole('button', { name: 'IT·개발' })).toBeInTheDocument()
  })

  it('shows today when hasCompletedOnboarding is true', async () => {
    vi.mocked(api.getUserInterests).mockResolvedValue({
      hasCompletedOnboarding: true,
      interests: [],
    })
    render(<App />)
    expect(await screen.findByText('오늘의 깸')).toBeInTheDocument()
  })
})

describe('Today article intro flow', () => {
  beforeEach(() => {
    vi.mocked(api.getUserInterests).mockReset()
    vi.mocked(api.getTodayArticles).mockReset()
    vi.mocked(api.getArticleDetail).mockReset()
    vi.mocked(api.getUserInterests).mockResolvedValue({
      hasCompletedOnboarding: true,
      interests: [],
    })
    vi.mocked(api.getTodayArticles).mockResolvedValue({
      items: [ARTICLE_A],
      emptyStateMessage: null,
    })
  })

  it('calls getArticleDetail with the feature article id when its CTA is clicked', async () => {
    vi.mocked(api.getArticleDetail).mockResolvedValue(ARTICLE_A_DETAIL)
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: /글 살펴보기/ }))

    expect(api.getArticleDetail).toHaveBeenCalledExactlyOnceWith(ARTICLE_A.id)
  })

  it('calls getArticleDetail with the newly promoted feature article id', async () => {
    vi.mocked(api.getTodayArticles).mockResolvedValue({
      items: [ARTICLE_A, ARTICLE_B],
      emptyStateMessage: null,
    })
    vi.mocked(api.getArticleDetail).mockResolvedValue(ARTICLE_A_DETAIL)
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: new RegExp(ARTICLE_B.title) }))
    await userEvent.click(await screen.findByRole('button', { name: /글 살펴보기/ }))

    expect(api.getArticleDetail).toHaveBeenCalledExactlyOnceWith(ARTICLE_B.id)
  })

  it('shows the article intro and goes back to today without refetching the today list', async () => {
    vi.mocked(api.getArticleDetail).mockResolvedValue(ARTICLE_A_DETAIL)
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: /글 살펴보기/ }))
    expect(await screen.findByText(ARTICLE_A_DETAIL.title)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /뒤로가기/ }))

    expect(await screen.findByText('오늘의 깸')).toBeInTheDocument()
    expect(api.getTodayArticles).toHaveBeenCalledTimes(1)
  })

  it('shows an error with a retry button when the article detail request fails', async () => {
    vi.mocked(api.getArticleDetail).mockRejectedValue(new Error('boom'))
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: /글 살펴보기/ }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /다시 시도/ })).toBeInTheDocument()
  })

  it('retries getArticleDetail with the same article id', async () => {
    vi.mocked(api.getArticleDetail).mockRejectedValueOnce(new Error('boom'))
    vi.mocked(api.getArticleDetail).mockResolvedValueOnce(ARTICLE_A_DETAIL)
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: /글 살펴보기/ }))
    await screen.findByRole('alert')
    await userEvent.click(screen.getByRole('button', { name: /다시 시도/ }))

    expect(await screen.findByText(ARTICLE_A_DETAIL.title)).toBeInTheDocument()
    expect(api.getArticleDetail).toHaveBeenNthCalledWith(1, ARTICLE_A.id)
    expect(api.getArticleDetail).toHaveBeenNthCalledWith(2, ARTICLE_A.id)
  })

  it('completes the full flow: select feature, open article, open original, start mission, change mission, save, and return to today', async () => {
    vi.mocked(api.getTodayArticles).mockResolvedValue({
      items: [ARTICLE_A, ARTICLE_B],
      emptyStateMessage: null,
    })
    vi.mocked(api.getArticleDetail).mockResolvedValue(ARTICLE_A_DETAIL)
    vi.mocked(api.createMissionRecord).mockResolvedValue({
      id: '50000000-0000-0000-0000-000000000001',
      articleId: ARTICLE_A_DETAIL.id,
      missionType: 'rebuttal',
      missionPrompt: '이 주장에 반대한다면?',
      userAnswer: '나는 동의하지 않는다.',
      selectedQuote: null,
      anchorType: 'whole_content',
      createdAt: '2026-07-20T05:00:00Z',
    })
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: /글 살펴보기/ }))

    expect(await screen.findByText(ARTICLE_A_DETAIL.title)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: /원문 읽으러 가기/ }))
    await userEvent.click(await screen.findByRole('button', { name: /미션 시작하기/ }))

    await userEvent.selectOptions(screen.getByRole('combobox'), 'rebuttal')
    expect(screen.getByText('이 주장에 반대한다면?')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('textbox'), '나는 동의하지 않는다.')
    await userEvent.click(screen.getByRole('button', { name: /기록 남기기/ }))

    expect(await screen.findByText('생각을 기록했어요.')).toBeInTheDocument()
    expect(api.createMissionRecord).toHaveBeenCalledExactlyOnceWith({
      articleId: ARTICLE_A_DETAIL.id,
      missionType: 'rebuttal',
      userAnswer: '나는 동의하지 않는다.',
    })

    await userEvent.click(screen.getByRole('button', { name: /오늘의 깸으로/ }))

    expect(await screen.findByText('오늘의 깸')).toBeInTheDocument()
    expect(api.getTodayArticles).toHaveBeenCalledTimes(1)
  })

  it('keeps the promoted feature article after returning from the article intro', async () => {
    vi.mocked(api.getTodayArticles).mockResolvedValue({
      items: [ARTICLE_A, ARTICLE_B],
      emptyStateMessage: null,
    })
    vi.mocked(api.getArticleDetail).mockResolvedValue(ARTICLE_A_DETAIL)
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: new RegExp(ARTICLE_B.title) }))
    expect(screen.getAllByRole('article')[0]).toHaveTextContent(ARTICLE_B.title)

    await userEvent.click(screen.getByRole('button', { name: /글 살펴보기/ }))
    expect(await screen.findByText(ARTICLE_A_DETAIL.title)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /뒤로가기/ }))

    expect(await screen.findByText('오늘의 깸')).toBeInTheDocument()
    expect(screen.getAllByRole('article')[0]).toHaveTextContent(ARTICLE_B.title)
    expect(api.getTodayArticles).toHaveBeenCalledTimes(1)
  })
})
