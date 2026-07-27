import { describe, it, expect, vi, afterEach } from 'vitest'
import { analyzeReviews, suggestionForKeyword } from '../src/services/reviews.service.js'

process.env.ANTHROPIC_API_KEY ??= 'test-key'

// analyzeReviews는 감정/키워드/답변초안 판단을 Claude API(callClaudeTool → fetch)에 위임한다.
// 여기서는 fetch를 모킹해 Claude가 특정 결과를 반환했다고 가정하고,
// 이 서비스가 로컬에서 실제로 책임지는 부분(점수 계산, reviewId 부여, 개선 제안, 프롬프트 조립)만 검증한다.
function stubClaudeResponse({ sentiment, keywords, replyDrafts = { polite: 'p', friendly: 'f', concise: 'c' } }) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({
    ok: true,
    json: async () => ({
      content: [{ type: 'tool_use', input: { sentiment, keywords, replyDrafts } }],
    }),
  }))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('analyzeReviews', () => {
  it('긍정 리뷰의 관심도 점수는 10점이다', async () => {
    stubClaudeResponse({ sentiment: 'positive', keywords: ['맛'] })
    const [result] = await analyzeReviews(['정말 좋았어요'])
    expect(result.score).toBe(10)
  })

  it('중립 리뷰의 관심도 점수는 40점이다', async () => {
    stubClaudeResponse({ sentiment: 'neutral', keywords: ['일반'] })
    const [result] = await analyzeReviews(['그냥 그랬어요'])
    expect(result.score).toBe(40)
  })

  it('부정 리뷰(키워드 1개)의 관심도 점수는 70점이다', async () => {
    stubClaudeResponse({ sentiment: 'negative', keywords: ['친절도'] })
    const [result] = await analyzeReviews(['직원이 불친절했어요'])
    expect(result.score).toBe(70)
  })

  it('부정 리뷰는 매칭 키워드가 많을수록 관심도 점수가 높다', async () => {
    stubClaudeResponse({ sentiment: 'negative', keywords: ['맛', '대기시간'] })
    const [result] = await analyzeReviews(['음식이 맛없고 너무 오래 기다렸어요'])
    expect(result.score).toBeGreaterThan(70)
  })

  it('부정 리뷰 점수는 100점을 넘지 않는다', async () => {
    stubClaudeResponse({ sentiment: 'negative', keywords: ['맛', '친절도', '대기시간'] })
    const [result] = await analyzeReviews(['최악이었어요'])
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('reviewId는 순서대로 r_01, r_02 형식으로 매겨진다', async () => {
    stubClaudeResponse({ sentiment: 'neutral', keywords: ['일반'] })
    const results = await analyzeReviews(['첫 번째 리뷰', '두 번째 리뷰'])
    expect(results[0].reviewId).toBe('r_01')
    expect(results[1].reviewId).toBe('r_02')
  })

  it('긍정/중립 리뷰는 improvementSuggestion이 없다', async () => {
    stubClaudeResponse({ sentiment: 'positive', keywords: ['맛'] })
    const [result] = await analyzeReviews(['정말 맛있었어요'])
    expect(result.improvementSuggestion).toBeNull()
  })

  it('부정 리뷰는 첫 번째 키워드에 대한 개선 제안이 붙는다', async () => {
    stubClaudeResponse({ sentiment: 'negative', keywords: ['대기시간', '맛'] })
    const [result] = await analyzeReviews(['너무 오래 기다렸고 맛도 별로였어요'])
    expect(result.improvementSuggestion).toBe(suggestionForKeyword('대기시간'))
  })

  it('리뷰 원문이 Claude에게 보내는 프롬프트에 그대로 포함된다', async () => {
    let capturedBody
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => {
      capturedBody = JSON.parse(options.body)
      return {
        ok: true,
        json: async () => ({
          content: [
            {
              type: 'tool_use',
              input: { sentiment: 'neutral', keywords: ['일반'], replyDrafts: { polite: 'p', friendly: 'f', concise: 'c' } },
            },
          ],
        }),
      }
    })
    await analyzeReviews(['이 문장이 프롬프트에 들어가야 한다'])
    expect(capturedBody.messages[0].content).toContain('이 문장이 프롬프트에 들어가야 한다')
  })
})

describe('analyzeReviews — keywords enum 가드', () => {
  it('스키마 밖 키워드는 "일반"으로 대체된다', async () => {
    stubClaudeResponse({ sentiment: 'negative', keywords: ['불편'] })
    const [result] = await analyzeReviews(['별로였어요'])
    expect(result.keywords).toEqual(['일반'])
  })

  it('스키마 안 키워드는 그대로 유지되고, 밖의 값만 대체된다', async () => {
    stubClaudeResponse({ sentiment: 'negative', keywords: ['대기시간', '불편함'] })
    const [result] = await analyzeReviews(['너무 오래 기다렸고 불편했어요'])
    expect(result.keywords).toEqual(['대기시간', '일반'])
  })

  it('대체 후 "일반"이 중복되면 하나로 합친다', async () => {
    stubClaudeResponse({ sentiment: 'negative', keywords: ['불편', '불편함'] })
    const [result] = await analyzeReviews(['별로였어요'])
    expect(result.keywords).toEqual(['일반'])
  })

  it('점수 계산은 대체·중복 제거된 키워드 개수를 기준으로 한다', async () => {
    stubClaudeResponse({ sentiment: 'negative', keywords: ['불편', '불편함'] })
    const [result] = await analyzeReviews(['별로였어요'])
    expect(result.score).toBe(70)
  })
})

describe('suggestionForKeyword', () => {
  it('매칭되는 키워드가 없으면 일반 제안을 반환한다', () => {
    expect(suggestionForKeyword('존재하지않는키워드')).toBe(suggestionForKeyword('일반'))
  })
})
