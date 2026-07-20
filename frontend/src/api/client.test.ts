import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from './client'
import type { CreateMissionRecordRequest } from './types'

describe('api client', () => {
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
