import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from './client'
import type { CreateMissionRecordRequest } from './types'

describe('api client', () => {
  it('uses the configured backend origin without duplicating the path separator', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const api = createApiClient(
      async () => 'token',
      fetcher,
      'https://hub-backend-eta.vercel.app/',
    )

    await api.getInterests()

    expect(fetcher.mock.calls[0][0]).toBe(
      'https://hub-backend-eta.vercel.app/api/interests',
    )
  })

  it('reads the latest token for every request', async () => {
    const getToken = vi
      .fn()
      .mockResolvedValueOnce('token-1')
      .mockResolvedValueOnce('token-2')
    const fetcher = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({ items: [], emptyStateMessage: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const api = createApiClient(getToken, fetcher)
    await api.getTodayArticles()
    await api.getTodayArticles()
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer token-1' })
    expect(fetcher.mock.calls[1][1]?.headers).toMatchObject({ Authorization: 'Bearer token-2' })
  })

  it('getArticleDetail calls the encoded article detail path and returns the response as-is', async () => {
    const articleDetail = {
      id: 'abc def/1',
      title: '글 제목',
      translatedTitle: null,
      sourceName: 'Toss Tech',
      sourceType: 'official_blog',
      contentType: 'blog',
      publishedAt: '2026-07-14T03:00:00Z',
      author: null,
      officialExcerpt: '원출처가 제공한 소개문',
      translatedExcerpt: null,
      readingTimeMinutes: 5,
      language: 'ko',
      accessType: 'free',
      urlStatus: 'active',
      originalUrl: 'https://example.com/article',
      recommendedMission: { type: 'connection', prompt: '내 상황이나 프로젝트와 연결해보면?' },
      missionOptions: [{ type: 'connection', prompt: '내 상황이나 프로젝트와 연결해보면?' }],
    }
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(articleDetail), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const api = createApiClient(async () => 'token', fetcher)
    const result = await api.getArticleDetail('abc def/1')

    expect(fetcher.mock.calls[0][0]).toBe('/api/articles/abc%20def%2F1')
    expect(fetcher.mock.calls[0][1]?.method ?? 'GET').toBe('GET')
    expect(result).toEqual(articleDetail)
  })

  it('createMissionRecord posts to /api/mission-records with exactly three body keys and returns the response as-is', async () => {
    const missionRecord = {
      id: '50000000-0000-0000-0000-000000000001',
      articleId: '40000000-0000-0000-0000-000000000001',
      missionType: 'connection',
      missionPrompt: '내 상황이나 프로젝트와 연결해보면?',
      userAnswer: '우리 팀 온보딩도 결국 같은 문제다.',
      selectedQuote: null,
      anchorType: 'whole_content',
      createdAt: '2026-07-20T05:00:00Z',
    }
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(missionRecord), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const api = createApiClient(async () => 'token', fetcher)
    const result = await api.createMissionRecord({
      articleId: '40000000-0000-0000-0000-000000000001',
      missionType: 'connection',
      userAnswer: '우리 팀 온보딩도 결국 같은 문제다.',
    })

    expect(fetcher.mock.calls[0][0]).toBe('/api/mission-records')
    expect(fetcher.mock.calls[0][1]?.method).toBe('POST')
    const sentBody = JSON.parse(fetcher.mock.calls[0][1]?.body as string)
    expect(Object.keys(sentBody).sort()).toEqual(['articleId', 'missionType', 'userAnswer'])
    expect(result).toEqual(missionRecord)
  })

  it('createMissionRecord strips extra properties from a wider request object before sending', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const api = createApiClient(async () => 'token', fetcher)
    const requestWithExtraFields = {
      articleId: '40000000-0000-0000-0000-000000000001',
      missionType: 'connection',
      userAnswer: '우리 팀 온보딩도 결국 같은 문제다.',
      missionPrompt: '조작하려는 프롬프트',
      userId: '99999999-0000-0000-0000-000000000099',
      anchorType: 'highlight',
      selectedQuote: '조작하려는 인용문',
    } as CreateMissionRecordRequest

    await api.createMissionRecord(requestWithExtraFields)

    const sentBody = JSON.parse(fetcher.mock.calls[0][1]?.body as string)
    expect(Object.keys(sentBody).sort()).toEqual(['articleId', 'missionType', 'userAnswer'])
    expect(sentBody).toEqual({
      articleId: '40000000-0000-0000-0000-000000000001',
      missionType: 'connection',
      userAnswer: '우리 팀 온보딩도 결국 같은 문제다.',
    })
  })

  it('getMissionRecords calls the encoded date path with GET and returns the array as-is', async () => {
    const records = [
      {
        id: '50000000-0000-0000-0000-000000000001',
        articleId: '40000000-0000-0000-0000-000000000001',
        articleTitle: '숏폼 시대, 우리는 정말 더 많이 이해하고 있을까',
        sourceName: '요즘IT',
        interestTags: [{ id: '20000000-0000-0000-0000-000000000001', name: 'IT·개발' }],
        missionType: 'connection',
        missionPrompt: '내 상황이나 프로젝트와 연결해보면?',
        userAnswer: '생각을 정리해봤다.',
        createdAt: '2026-07-21T03:00:00Z',
        originalUrl: 'https://example.com/article',
        urlStatus: 'active',
      },
    ]
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(records), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const api = createApiClient(async () => 'token', fetcher)
    const result = await api.getMissionRecords('2026-07-21')

    expect(fetcher.mock.calls[0][0]).toBe('/api/mission-records?date=2026-07-21')
    expect(fetcher.mock.calls[0][1]?.method ?? 'GET').toBe('GET')
    expect(fetcher.mock.calls[0][1]?.body).toBeUndefined()
    expect(result).toEqual(records)
  })

  it('getMissionRecords encodes special characters in the date value', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const api = createApiClient(async () => 'token', fetcher)
    await api.getMissionRecords('2026-07-21&x=1')

    expect(fetcher.mock.calls[0][0]).toBe('/api/mission-records?date=2026-07-21%26x%3D1')
  })

  it('getMissionRecordsCalendar calls the encoded month path with GET and returns the response as-is', async () => {
    const calendar = {
      month: '2026-07',
      days: [
        { date: '2026-07-03', recordCount: 1, firstMissionType: 'question' },
        { date: '2026-07-21', recordCount: 3, firstMissionType: 'connection' },
      ],
    }
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(calendar), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const api = createApiClient(async () => 'token', fetcher)
    const result = await api.getMissionRecordsCalendar('2026-07')

    expect(fetcher.mock.calls[0][0]).toBe('/api/mission-records/calendar?month=2026-07')
    expect(fetcher.mock.calls[0][1]?.method ?? 'GET').toBe('GET')
    expect(fetcher.mock.calls[0][1]?.body).toBeUndefined()
    expect(result).toEqual(calendar)
  })

  it('getMissionRecordsCalendar encodes special characters in the month value', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ month: '', days: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const api = createApiClient(async () => 'token', fetcher)
    await api.getMissionRecordsCalendar('2026-07&x=1')

    expect(fetcher.mock.calls[0][0]).toBe(
      '/api/mission-records/calendar?month=2026-07%26x%3D1',
    )
  })

  it('throws ApiClientError with the common error envelope', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        code: 'VALIDATION_ERROR',
        message: '요청값을 확인해 주세요.',
        details: [{ field: 'interestIds', reason: 'too_short' }],
      }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const api = createApiClient(async () => 'token', fetcher)
    await expect(api.getTodayArticles()).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: '요청값을 확인해 주세요.',
      details: [{ field: 'interestIds', reason: 'too_short' }],
    })
  })
})
