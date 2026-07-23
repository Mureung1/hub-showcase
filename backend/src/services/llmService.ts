/**
 * LLM 추상화 서비스
 * 여러 LLM 제공자 (Ollama, Claude, LlamaCPP 등)를 통일된 인터페이스로 관리
 * 제공자는 .env의 LLM_PROVIDER로 쉽게 전환 가능
 */

interface LLMResponse {
  success: boolean
  content: string
  error?: string
  provider: string
}

class LLMService {
  private provider: string
  private model: string

  constructor() {
    this.provider = process.env.LLM_PROVIDER || 'ollama'
    this.model = this.getModel()
    console.log(`🤖 LLM Service initialized: ${this.provider} (${this.model})`)
  }

  private getModel(): string {
    switch (this.provider) {
      case 'ollama':
        return process.env.OLLAMA_MODEL || 'qwen2.5:7b'
      case 'claude':
        return process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022'
      case 'llamacpp':
        return 'local-model' // LlamaCPP는 별도 설정 불필요
      case 'openai':
        return process.env.OPENAI_MODEL || 'gpt-4o-mini'
      default:
        return 'qwen2.5:7b'
    }
  }

  /**
   * README를 한국어로 요약
   * @param readme - 원본 README (마크다운)
   * @returns 요약된 텍스트
   */
  async summarizeReadme(readme: string): Promise<LLMResponse> {
    const prompt = `다음 README의 핵심 기능과 특징을 3~5줄의 한국어로 요약해줘.
기술 스택, 주요 기능, 사용 용도만 포함해.
마크다운 형식은 제거하고 일반 텍스트로.

[README]
${readme.substring(0, 2000)}
[/README]

요약:`

    return this.callLLM(prompt)
  }

  /**
   * 텍스트를 한국어로 번역
   * @param text - 원본 텍스트
   * @returns 번역된 텍스트
   */
  async translateToKorean(text: string): Promise<LLMResponse> {
    const prompt = `다음 영어 텍스트를 자연스러운 한국어로 번역해줘.
기술 용어는 영어로 유지해도 괜찮아.

[TEXT]
${text}
[/TEXT]

번역:`

    return this.callLLM(prompt)
  }

  /**
   * 텍스트에서 핵심 포인트 추출
   * @param text - 원본 텍스트
   * @param count - 추출할 포인트 개수 (기본값: 3)
   * @returns 핵심 포인트 배열
   */
  async extractBulletPoints(text: string, count: number = 3): Promise<string[]> {
    const prompt = `다음 텍스트에서 ${count}개의 핵심 포인트를 한국어로 뽑아줘.
각 포인트는 한 줄씩.
숫자나 특수문자 없이 정의처럼 작성해줘.

[TEXT]
${text.substring(0, 1500)}
[/TEXT]

핵심 포인트 ${count}개:`

    const response = await this.callLLM(prompt)
    if (!response.success) {
      return []
    }

    return response.content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .slice(0, count)
  }

  /**
   * 실제 LLM 호출 (제공자별 구현)
   */
  private async callLLM(prompt: string): Promise<LLMResponse> {
    try {
      switch (this.provider) {
        case 'ollama':
          return await this.callOllama(prompt)
        case 'claude':
          return await this.callClaude(prompt)
        case 'llamacpp':
          return await this.callLlamaCPP(prompt)
        case 'openai':
          return await this.callOpenAI(prompt)
        default:
          return {
            success: false,
            content: '',
            error: `Unknown provider: ${this.provider}`,
            provider: this.provider,
          }
      }
    } catch (error) {
      console.error(`❌ LLM Error (${this.provider}):`, error)
      return {
        success: false,
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.provider,
      }
    }
  }

  /**
   * Ollama API 호출 (로컬)
   */
  private async callOllama(prompt: string): Promise<LLMResponse> {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    const url = `${baseUrl}/api/generate`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`)
    }

    const data = (await response.json()) as { response: string }
    return {
      success: true,
      content: data.response.trim(),
      provider: 'ollama',
    }
  }

  /**
   * Claude API 호출 (Anthropic)
   */
  private async callClaude(prompt: string): Promise<LLMResponse> {
    const apiKey = process.env.CLAUDE_API_KEY
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY is not set')
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`)
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>
    }
    const content = data.content[0]?.text || ''

    return {
      success: true,
      content: content.trim(),
      provider: 'claude',
    }
  }

  /**
   * LlamaCPP API 호출 (로컬)
   */
  private async callLlamaCPP(prompt: string): Promise<LLMResponse> {
    const baseUrl = process.env.LLAMACPP_BASE_URL || 'http://localhost:8000'
    const url = `${baseUrl}/v1/completions`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`LlamaCPP API error: ${response.statusText}`)
    }

    const data = (await response.json()) as {
      choices: Array<{ text: string }>
    }
    const content = data.choices[0]?.text || ''

    return {
      success: true,
      content: content.trim(),
      provider: 'llamacpp',
    }
  }

  /**
   * OpenAI API 호출
   */
  private async callOpenAI(prompt: string): Promise<LLMResponse> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set')
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>
    }
    const content = data.choices[0]?.message?.content || ''

    return {
      success: true,
      content: content.trim(),
      provider: 'openai',
    }
  }

  /**
   * 현재 설정 정보 반환
   */
  getInfo() {
    return {
      provider: this.provider,
      model: this.model,
      status: 'ready',
    }
  }
}

// 싱글톤 인스턴스
export const llmService = new LLMService()
