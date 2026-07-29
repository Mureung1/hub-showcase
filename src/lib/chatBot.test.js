import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildChatSystemPrompt, buildChatUserPrompt, sendChatMessage } from './chatBot.js'

describe('buildChatSystemPrompt', () => {
  it('오늘 섭취/권장량 숫자를 문장에 그대로 담는다', () => {
    const prompt = buildChatSystemPrompt({
      recommended: { protein: 60 },
      todayTotal: { protein: 45 },
    })
    expect(prompt).toContain('단백질 45g(권장 60g)')
  })

  it('의료 표현 금지 규칙(dietAnalysis.js와 동일)을 포함한다', () => {
    const prompt = buildChatSystemPrompt({ recommended: {}, todayTotal: {} })
    expect(prompt).toContain('질병 진단·치료 표현은 절대 쓰지 마세요')
  })

  it('오늘 기록이 없으면(둘 다 비었거나 숫자 아님) 정직하게 안내한다', () => {
    const prompt = buildChatSystemPrompt(undefined)
    expect(prompt).toContain('사용자의 오늘 섭취 기록이 아직 없습니다.')
  })

  it('recommended/todayTotal 중 하나만 숫자여도 그 영양소는 문장에서 빠진다', () => {
    const prompt = buildChatSystemPrompt({ recommended: { protein: 60 }, todayTotal: {} })
    expect(prompt).not.toContain('단백질')
  })
})

describe('buildChatUserPrompt', () => {
  it('이력이 없으면 메시지를 그대로 반환한다', () => {
    expect(buildChatUserPrompt('안녕', [])).toBe('안녕')
  })

  it('이력이 있으면 [이전 대화]/[새 질문] 형식으로 감싼다', () => {
    const history = [
      { role: 'user', text: '오늘 나트륨 많이 먹었나요?' },
      { role: 'bot', text: '네, 권장량을 넘었어요.' },
    ]
    const prompt = buildChatUserPrompt('그럼 뭘 줄여야 해요?', history)
    expect(prompt).toContain('사용자: 오늘 나트륨 많이 먹었나요?')
    expect(prompt).toContain('챗봇: 네, 권장량을 넘었어요.')
    expect(prompt).toContain('[새 질문]\n그럼 뭘 줄여야 해요?')
  })

  it('이력이 6개를 넘으면 최근 6개만 싣는다', () => {
    const history = Array.from({ length: 10 }, (_, i) => ({ role: 'user', text: `메시지${i}` }))
    const prompt = buildChatUserPrompt('마지막 질문', history)
    expect(prompt).not.toContain('메시지0')
    expect(prompt).not.toContain('메시지3')
    expect(prompt).toContain('메시지4')
    expect(prompt).toContain('메시지9')
  })
})

describe('sendChatMessage', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('빈 메시지는 요청 없이 즉시 에러를 던진다', async () => {
    await expect(sendChatMessage({ message: '' })).rejects.toThrow('message is required')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('/api/chat에 POST하고 text를 반환한다', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ text: '안녕하세요!' }) })
    const result = await sendChatMessage({ message: '안녕', dailyContext: {} })
    expect(result).toBe('안녕하세요!')
    expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({ method: 'POST' }))
  })

  it('서버가 에러를 반환하면 그 메시지로 예외를 던진다', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: '잠시 후 다시 시도해주세요.' }) })
    await expect(sendChatMessage({ message: '안녕' })).rejects.toThrow('잠시 후 다시 시도해주세요.')
  })
})
