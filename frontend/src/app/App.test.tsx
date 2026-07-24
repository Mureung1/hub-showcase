import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { ArticleDetail, TodayArticle } from '../api/types'

vi.mock('../auth/supabase', () => ({
  ensureAnonymousSession: vi.fn().mockResolvedValue({ access_token: 'token' }),
}))

vi.mock('../api/client', () => {
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
      getMissionRecords: vi.fn().mockResolvedValue([]),
      getMissionRecordsCalendar: vi.fn().mockResolvedValue({ month: '2026-07', days: [] }),
    },
  }
})

import { api } from '../api/client'

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

  it('shows the common loading screen while initializing', async () => {
    let resolveUserInterests: ((value: { hasCompletedOnboarding: boolean; interests: [] }) => void) | undefined
    vi.mocked(api.getUserInterests).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveUserInterests = resolve
        }),
    )
    render(<App />)

    expect(await screen.findByRole('status')).toHaveTextContent('깸을 준비하고 있어요')

    resolveUserInterests?.({ hasCompletedOnboarding: true, interests: [] })
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
    expect(await screen.findByRole('heading', { name: '오늘의 깸' })).toBeInTheDocument()
  })

  it('shows an error without infinite loading when initialization fails', async () => {
    vi.mocked(api.getUserInterests).mockRejectedValue(new Error('boom'))
    render(<App />)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('Onboarding to Today content loading flow', () => {
  const INTEREST: import('../api/types').Interest = {
    id: 'interest-1',
    name: 'IT·개발',
    displayOrder: 1,
    launchStatus: 'active',
    riskLevel: 'low',
    emptyStateMessage: null,
  }

  beforeEach(() => {
    vi.mocked(api.getUserInterests).mockReset()
    vi.mocked(api.getInterests).mockReset()
    vi.mocked(api.replaceUserInterests).mockReset()
    vi.mocked(api.getTodayArticles).mockReset()
    vi.mocked(api.getUserInterests).mockResolvedValue({
      hasCompletedOnboarding: false,
      interests: [],
    })
    vi.mocked(api.getInterests).mockResolvedValue([INTEREST])
  })

  it('shows the content loading screen while the today fetch for an existing user is in flight', async () => {
    vi.mocked(api.getUserInterests).mockReset()
    vi.mocked(api.getUserInterests).mockResolvedValue({
      hasCompletedOnboarding: true,
      interests: [],
    })
    let resolveToday: ((value: { items: []; emptyStateMessage: null }) => void) | undefined
    vi.mocked(api.getTodayArticles).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveToday = resolve
        }),
    )
    render(<App />)

    expect(await screen.findByText('관심사에 맞는 오늘의 글을 고르고 있어요')).toBeInTheDocument()

    resolveToday?.({ items: [], emptyStateMessage: null })
    expect(await screen.findByRole('heading', { name: '오늘의 깸' })).toBeInTheDocument()
  })

  it('shows the content loading screen immediately on CTA click, before the save request resolves', async () => {
    let resolveSave: ((value: { interestIds: string[] }) => void) | undefined
    vi.mocked(api.replaceUserInterests).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve
        }),
    )
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: 'IT·개발' }))
    await userEvent.click(screen.getByRole('button', { name: /깸 시작하기/ }))

    expect(await screen.findByRole('status')).toHaveTextContent('관심사에 맞는 오늘의 글을 고르고 있어요')

    resolveSave?.({ interestIds: [INTEREST.id] })
  })

  it('keeps showing the same content loading screen through save success and the today fetch', async () => {
    vi.mocked(api.replaceUserInterests).mockResolvedValue({ interestIds: [INTEREST.id] })
    let resolveToday: ((value: { items: []; emptyStateMessage: null }) => void) | undefined
    vi.mocked(api.getTodayArticles).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveToday = resolve
        }),
    )
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: 'IT·개발' }))
    await userEvent.click(screen.getByRole('button', { name: /깸 시작하기/ }))

    expect(await screen.findByRole('status')).toHaveTextContent('관심사에 맞는 오늘의 글을 고르고 있어요')

    resolveToday?.({ items: [], emptyStateMessage: null })
    expect(await screen.findByRole('heading', { name: '오늘의 깸' })).toBeInTheDocument()
  })

  it('returns to onboarding with the selection kept and does not fetch today content when saving fails', async () => {
    vi.mocked(api.replaceUserInterests).mockRejectedValue(new Error('network'))
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: 'IT·개발' }))
    await userEvent.click(screen.getByRole('button', { name: /깸 시작하기/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/다시 시도/)
    expect(screen.getByRole('button', { name: 'IT·개발' })).toHaveAttribute('aria-pressed', 'true')
    expect(api.getTodayArticles).not.toHaveBeenCalled()
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

  it('shows the common loading screen while ArticleDetail is being fetched', async () => {
    let resolveArticleDetail: ((value: ArticleDetail) => void) | undefined
    vi.mocked(api.getArticleDetail).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveArticleDetail = resolve
        }),
    )
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: /읽고 미션 받기/ }))

    expect(await screen.findByText('오늘의 글을 불러오고 있어요')).toBeInTheDocument()

    resolveArticleDetail?.(ARTICLE_A_DETAIL)
    expect(await screen.findByText(ARTICLE_A_DETAIL.title)).toBeInTheDocument()
  })

  it('calls getArticleDetail with the feature article id when its CTA is clicked', async () => {
    vi.mocked(api.getArticleDetail).mockResolvedValue(ARTICLE_A_DETAIL)
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: /읽고 미션 받기/ }))

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
    await userEvent.click(await screen.findByRole('button', { name: /읽고 미션 받기/ }))

    expect(api.getArticleDetail).toHaveBeenCalledExactlyOnceWith(ARTICLE_B.id)
  })

  it('shows the article intro and goes back to today without refetching the today list', async () => {
    vi.mocked(api.getArticleDetail).mockResolvedValue(ARTICLE_A_DETAIL)
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: /읽고 미션 받기/ }))
    expect(await screen.findByText(ARTICLE_A_DETAIL.title)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /뒤로가기/ }))

    expect(await screen.findByRole('heading', { name: '오늘의 깸' })).toBeInTheDocument()
    expect(api.getTodayArticles).toHaveBeenCalledTimes(1)
  })

  it('shows an error with a retry button when the article detail request fails', async () => {
    vi.mocked(api.getArticleDetail).mockRejectedValue(new Error('boom'))
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: /읽고 미션 받기/ }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /다시 시도/ })).toBeInTheDocument()
  })

  it('retries getArticleDetail with the same article id', async () => {
    vi.mocked(api.getArticleDetail).mockRejectedValueOnce(new Error('boom'))
    vi.mocked(api.getArticleDetail).mockResolvedValueOnce(ARTICLE_A_DETAIL)
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: /읽고 미션 받기/ }))
    await screen.findByRole('alert')
    await userEvent.click(screen.getByRole('button', { name: /다시 시도/ }))

    expect(await screen.findByText(ARTICLE_A_DETAIL.title)).toBeInTheDocument()
    expect(api.getArticleDetail).toHaveBeenNthCalledWith(1, ARTICLE_A.id)
    expect(api.getArticleDetail).toHaveBeenNthCalledWith(2, ARTICLE_A.id)
  })

  it('completes the full flow: select feature, open article, open original, start mission, change mission, save, and go to MyGgaem', async () => {
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

    await userEvent.click(await screen.findByRole('button', { name: /읽고 미션 받기/ }))

    expect(await screen.findByText(ARTICLE_A_DETAIL.title)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: /원문 읽으러 가기/ }))
    await userEvent.click(await screen.findByRole('button', { name: /깸 작성하기/ }))

    await userEvent.click(screen.getByRole('button', { name: '반박' }))
    expect(screen.getByText('이 주장에 반대한다면?')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('textbox'), '나는 동의하지 않는다.')
    await userEvent.click(screen.getByRole('button', { name: /기록 남기기/ }))

    expect(await screen.findByText('오늘의 깸 완료!')).toBeInTheDocument()
    expect(api.createMissionRecord).toHaveBeenCalledExactlyOnceWith({
      articleId: ARTICLE_A_DETAIL.id,
      missionType: 'rebuttal',
      userAnswer: '나는 동의하지 않는다.',
    })

    await userEvent.click(screen.getByRole('button', { name: /나의 깸에서 보기/ }))

    expect(await screen.findByRole('heading', { name: '나의 깸' })).toBeInTheDocument()
    expect(api.getTodayArticles).toHaveBeenCalledTimes(1)
    expect(api.createMissionRecord).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: '오늘의 깸' }))

    expect(await screen.findByRole('heading', { name: '오늘의 깸' })).toBeInTheDocument()
    expect(screen.queryByText('글 소개')).not.toBeInTheDocument()
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

    await userEvent.click(screen.getByRole('button', { name: /읽고 미션 받기/ }))
    expect(await screen.findByText(ARTICLE_A_DETAIL.title)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /뒤로가기/ }))

    expect(await screen.findByRole('heading', { name: '오늘의 깸' })).toBeInTheDocument()
    expect(screen.getAllByRole('article')[0]).toHaveTextContent(ARTICLE_B.title)
    expect(api.getTodayArticles).toHaveBeenCalledTimes(1)
  })
})

describe('Today and MyGgaem tab navigation', () => {
  beforeEach(() => {
    vi.mocked(api.getUserInterests).mockReset()
    vi.mocked(api.getTodayArticles).mockReset()
    vi.mocked(api.getMissionRecords).mockReset()
    vi.mocked(api.getMissionRecordsCalendar).mockReset()
    vi.mocked(api.getUserInterests).mockResolvedValue({
      hasCompletedOnboarding: true,
      interests: [],
    })
    vi.mocked(api.getTodayArticles).mockResolvedValue({ items: [], emptyStateMessage: null })
    vi.mocked(api.getMissionRecords).mockResolvedValue([])
    vi.mocked(api.getMissionRecordsCalendar).mockResolvedValue({ month: '2026-07', days: [] })
  })

  it('enables the 나의 깸 tab on Today (not disabled)', async () => {
    render(<App />)

    expect(await screen.findByRole('button', { name: /나의 깸/ })).not.toBeDisabled()
  })

  it('shows the MyGgaem screen when the 나의 깸 tab is clicked', async () => {
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: /나의 깸/ }))

    expect(await screen.findByRole('heading', { name: '나의 깸' })).toBeInTheDocument()
  })

  describe('with system time fixed at 2026-07-21T16:00:00Z (KST 2026-07-22)', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2026-07-21T16:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    async function openMyGgaem() {
      render(<App />)
      await userEvent.click(await screen.findByRole('button', { name: /나의 깸/ }))
    }

    it('selects KST today (not the UTC or local calendar date) and requests the calendar and records for it', async () => {
      await openMyGgaem()

      await screen.findByRole('heading', { name: '나의 깸' })
      expect(api.getMissionRecordsCalendar).toHaveBeenCalledExactlyOnceWith('2026-07')
      expect(api.getMissionRecords).toHaveBeenCalledExactlyOnceWith('2026-07-22')
    })

    it('shows calendar and records success data once both requests resolve', async () => {
      vi.mocked(api.getMissionRecordsCalendar).mockResolvedValue({
        month: '2026-07',
        days: [{ date: '2026-07-22', recordCount: 2, firstMissionType: 'connection' }],
      })
      vi.mocked(api.getMissionRecords).mockResolvedValue([
        {
          id: '50000000-0000-0000-0000-000000000001',
          articleId: '40000000-0000-0000-0000-000000000001',
          articleTitle: 'A 글',
          sourceName: '요즘IT',
          interestTags: [{ id: 'interest-1', name: 'IT·개발' }],
          missionType: 'connection',
          missionPrompt: '내 상황이나 프로젝트와 연결해보면?',
          userAnswer: '생각',
          createdAt: '2026-07-22T01:00:00Z',
          originalUrl: 'https://example.com/a',
          urlStatus: 'active',
        },
      ])

      await openMyGgaem()

      expect(await screen.findByRole('button', { name: /22일.*연결.*2개/ })).toBeInTheDocument()
      expect(await screen.findByRole('article')).toHaveTextContent('A 글')
    })

    it('refetches only the records API when a different date in the same month is selected', async () => {
      await openMyGgaem()
      await screen.findByRole('heading', { name: '나의 깸' })
      vi.mocked(api.getMissionRecordsCalendar).mockClear()
      vi.mocked(api.getMissionRecords).mockClear()

      await userEvent.click(screen.getByRole('button', { name: /^5일/ }))

      await vi.waitFor(() => {
        expect(api.getMissionRecords).toHaveBeenCalledExactlyOnceWith('2026-07-05')
      })
      expect(api.getMissionRecordsCalendar).not.toHaveBeenCalled()
    })

    it('keeps the same day of month when moving to the previous or next month', async () => {
      await openMyGgaem()
      await screen.findByRole('heading', { name: '나의 깸' })
      vi.mocked(api.getMissionRecordsCalendar).mockClear()
      vi.mocked(api.getMissionRecords).mockClear()

      await userEvent.click(screen.getByRole('button', { name: /^다음 달/ }))

      await vi.waitFor(() => {
        expect(api.getMissionRecordsCalendar).toHaveBeenCalledExactlyOnceWith('2026-08')
      })
      expect(api.getMissionRecords).toHaveBeenCalledExactlyOnceWith('2026-08-22')
    })

    it('clamps to the last day of the target month when the current day does not exist there', async () => {
      vi.setSystemTime(new Date('2026-03-30T15:00:00Z')) // KST 2026-03-31
      await openMyGgaem()
      await screen.findByRole('heading', { name: '나의 깸' })
      vi.mocked(api.getMissionRecordsCalendar).mockClear()
      vi.mocked(api.getMissionRecords).mockClear()

      await userEvent.click(screen.getByRole('button', { name: /^이전 달/ }))

      await vi.waitFor(() => {
        expect(api.getMissionRecords).toHaveBeenCalledExactlyOnceWith('2026-02-28')
      })
      expect(api.getMissionRecordsCalendar).toHaveBeenCalledExactlyOnceWith('2026-02')
    })

    it('clamps to February 29 in a leap year', async () => {
      vi.setSystemTime(new Date('2024-03-30T15:00:00Z')) // KST 2024-03-31
      await openMyGgaem()
      await screen.findByRole('heading', { name: '나의 깸' })
      vi.mocked(api.getMissionRecords).mockClear()

      await userEvent.click(screen.getByRole('button', { name: /^이전 달/ }))

      await vi.waitFor(() => {
        expect(api.getMissionRecords).toHaveBeenCalledExactlyOnceWith('2024-02-29')
      })
    })

    it('crosses a year boundary when moving from January to December of the previous year', async () => {
      vi.setSystemTime(new Date('2026-01-14T15:00:00Z')) // KST 2026-01-15
      await openMyGgaem()
      await screen.findByRole('heading', { name: '나의 깸' })
      vi.mocked(api.getMissionRecordsCalendar).mockClear()
      vi.mocked(api.getMissionRecords).mockClear()

      await userEvent.click(screen.getByRole('button', { name: /^이전 달/ }))

      await vi.waitFor(() => {
        expect(api.getMissionRecordsCalendar).toHaveBeenCalledExactlyOnceWith('2025-12')
      })
      expect(api.getMissionRecords).toHaveBeenCalledExactlyOnceWith('2025-12-15')
    })

    it('shows a calendar error alongside successful records data', async () => {
      vi.mocked(api.getMissionRecordsCalendar).mockRejectedValue(new Error('boom'))
      vi.mocked(api.getMissionRecords).mockResolvedValue([
        {
          id: '50000000-0000-0000-0000-000000000001',
          articleId: '40000000-0000-0000-0000-000000000001',
          articleTitle: 'A 글',
          sourceName: '요즘IT',
          interestTags: [],
          missionType: 'connection',
          missionPrompt: '내 상황이나 프로젝트와 연결해보면?',
          userAnswer: '생각',
          createdAt: '2026-07-22T01:00:00Z',
          originalUrl: 'https://example.com/a',
          urlStatus: 'active',
        },
      ])

      await openMyGgaem()

      expect(await screen.findByRole('alert')).toHaveTextContent('달력을 불러오지 못했어요.')
      expect(await screen.findByRole('article')).toHaveTextContent('A 글')
    })

    it('shows a records error alongside successful calendar data', async () => {
      vi.mocked(api.getMissionRecordsCalendar).mockResolvedValue({
        month: '2026-07',
        days: [{ date: '2026-07-22', recordCount: 1, firstMissionType: 'question' }],
      })
      vi.mocked(api.getMissionRecords).mockRejectedValue(new Error('boom'))

      await openMyGgaem()

      expect(await screen.findByRole('alert')).toHaveTextContent('기록을 불러오지 못했어요.')
      expect(await screen.findByRole('button', { name: /22일.*질문.*1개/ })).toBeInTheDocument()
    })

    it('retries only the calendar request from the calendar retry button', async () => {
      vi.mocked(api.getMissionRecordsCalendar).mockRejectedValueOnce(new Error('boom'))
      vi.mocked(api.getMissionRecordsCalendar).mockResolvedValueOnce({ month: '2026-07', days: [] })
      await openMyGgaem()
      await screen.findByRole('alert')
      vi.mocked(api.getMissionRecords).mockClear()

      await userEvent.click(screen.getByRole('button', { name: /다시 시도/ }))

      await vi.waitFor(() => {
        expect(api.getMissionRecordsCalendar).toHaveBeenCalledTimes(2)
      })
      expect(api.getMissionRecords).not.toHaveBeenCalled()
    })

    it('retries only the records request from the records retry button', async () => {
      vi.mocked(api.getMissionRecords).mockRejectedValueOnce(new Error('boom'))
      vi.mocked(api.getMissionRecords).mockResolvedValueOnce([])
      await openMyGgaem()
      await screen.findByRole('alert')
      vi.mocked(api.getMissionRecordsCalendar).mockClear()

      await userEvent.click(screen.getByRole('button', { name: /다시 시도/ }))

      await vi.waitFor(() => {
        expect(api.getMissionRecords).toHaveBeenCalledTimes(2)
      })
      expect(api.getMissionRecordsCalendar).not.toHaveBeenCalled()
    })

    it('does not let a stale late response overwrite the state for a newly selected date', async () => {
      let resolveFirst: ((items: never[]) => void) | undefined
      vi.mocked(api.getMissionRecords).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          }),
      )
      await openMyGgaem()
      await screen.findByRole('heading', { name: '나의 깸' })

      vi.mocked(api.getMissionRecords).mockResolvedValueOnce([
        {
          id: '50000000-0000-0000-0000-000000000009',
          articleId: '40000000-0000-0000-0000-000000000001',
          articleTitle: 'B 글',
          sourceName: '요즘IT',
          interestTags: [],
          missionType: 'expression',
          missionPrompt: '이 글이 놓친 관점은 뭐지?',
          userAnswer: '새 날짜의 기록',
          createdAt: '2026-07-05T01:00:00Z',
          originalUrl: 'https://example.com/b',
          urlStatus: 'active',
        },
      ])
      await userEvent.click(screen.getByRole('button', { name: /^5일/ }))
      expect(await screen.findByRole('article')).toHaveTextContent('새 날짜의 기록')

      // 이전(22일) 요청이 뒤늦게 응답해도 지금 선택된 5일의 데이터를 덮으면 안 된다.
      resolveFirst?.([])
      await Promise.resolve()
      expect(screen.getByRole('article')).toHaveTextContent('새 날짜의 기록')
    })

    it('returns to Today from the 오늘의 깸 tab without refetching getTodayArticles', async () => {
      await openMyGgaem()
      await screen.findByRole('heading', { name: '나의 깸' })
      expect(api.getTodayArticles).toHaveBeenCalledTimes(1)

      await userEvent.click(screen.getByRole('button', { name: '오늘의 깸' }))

      expect(await screen.findByRole('heading', { name: '오늘의 깸' })).toBeInTheDocument()
      expect(api.getTodayArticles).toHaveBeenCalledTimes(1)
    })
  })
})
