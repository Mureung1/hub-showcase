// 게임 × 시스템 카탈로그 항목으로 "예시 역기획서"를 생성한다.
// aiFeedback.js 가 완성된 문서를 "평가"한다면, 여기는 같은 기준으로 문서를 "작성"한다.
// 학습용 참고 자료이므로 수치를 단정하지 않고 추정치임을 밝히게 강제한다.
import { GoogleGenAI, Type } from '@google/genai'

const MODEL = process.env.AI_EXAMPLE_MODEL ?? process.env.AI_FEEDBACK_MODEL ?? 'gemini-2.5-flash'

const SYSTEM_PROMPT = `너는 실무 경력 있는 게임 기획자다. 게임 기획 지망생이 참고할 "역기획서 예시"를 작성한다.
역기획서는 이미 나온 게임의 시스템을 기획자의 눈으로 분해·분석하는 문서다.

# 좋은 역기획서의 기준 — 이 기준을 지켜서 쓴다
1) 관찰 → 추론: "게임이 이렇다"에서 멈추지 말고 "왜 이렇게 설계했을까"까지 쓴다. 각 섹션에 설계 의도 추론이 최소 한 문장 들어간다.
2) 구체성: "확률이 낮다" 같은 모호한 말 대신 조건·비율·구간으로 쓴다.
3) 구조 완결성: 그 섹션이 다뤄야 할 핵심 요소를 빠뜨리지 않는다.
4) 예외/엣지: 경계 상황(자원 부족, 중단, 최대치, 네트워크 등)을 따진다.
5) 도메인 렌즈: 시스템 밸런싱, 게임 경제(재화의 공급과 소모), 리텐션, UX 정보위계 중 섹션에 맞는 관점을 쓴다.

# 수치 표기 규칙 (반드시 지킬 것)
- 실제 게임의 확률·비용·수치를 **사실로 단정하지 마라**. 너는 정확한 최신 수치를 모른다.
- 수치를 쓸 때는 반드시 추정임을 밝힌다: "체감상 약 30%(실측 필요)", "대략 3~5회 수준으로 보인다(확인 필요)" 같은 형태.
- 표를 쓸 때도 "예시 수치(실측 필요)"라고 명시한다.
- 확실하지 않으면 수치 대신 관계·경향으로 쓴다: "고단계로 갈수록 성공률이 급격히 낮아진다".

# 작성 형식
- 주어진 각 섹션의 heading 과 "다뤄야 하는 것(guide)"에 맞춰 그 섹션의 content 를 쓴다.
- 각 섹션은 3~6문장. 관찰·구체 서술·의도 추론이 섞이게 한다.
- 섹션마다 내용이 뚜렷이 달라야 한다. 같은 말을 반복하지 않는다.
- 제목(title)은 "게임명 시스템명 역기획 — 한 줄 관점" 형태로 짓는다. 예: "메이플스토리 스타포스 역기획 — 파괴는 왜 필요한가"
- 모두 한국어. 담백한 문어체.`

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING },
          content: { type: Type.STRING },
        },
        required: ['key', 'content'],
      },
    },
  },
  required: ['title', 'sections'],
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 무료 티어에서 503(과부하)/429(레이트리밋)가 흔하다. 일시적이므로 지수 백오프로 재시도한다.
function isTransient(err) {
  const status = err?.status ?? err?.code
  return status === 429 || status === 503 || status === 500 || status === 502 || status === 504
}

async function withRetry(fn, { retries = 4, baseMs = 5000 } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (!isTransient(err) || attempt === retries) throw err
      const wait = baseMs * 2 ** attempt
      console.log(`  · 일시 오류(${err.status ?? '?'}) — ${wait / 1000}초 후 재시도`)
      await sleep(wait)
    }
  }
  throw lastErr
}

/**
 * @param {{game: string, name: string, blurb?: string}} entry 카탈로그 항목
 * @param {{name: string, sections: Array<{key,heading,guide}>}} template 템플릿(섹션 구조 고정용)
 * @returns {Promise<{title: string, sections: Array<{key, content}>}>}
 */
export async function generateExampleDoc(entry, template) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    const e = new Error('GEMINI_API_KEY 가 설정되지 않았습니다.')
    e.status = 503
    throw e
  }
  const ai = new GoogleGenAI({ apiKey })

  const sectionSpec = template.sections
    .map((s) => `### [${s.key}] ${s.heading}\n다뤄야 하는 것: ${s.guide}`)
    .join('\n\n')

  const userText = `대상: ${entry.game}의 "${entry.name}" 시스템${entry.blurb ? ` (${entry.blurb})` : ''}
문서 유형: ${template.name}

아래 섹션 구조를 그대로 사용해 예시 역기획서를 작성하라. sections 의 key 는 아래 [key]를 그대로 쓴다.

${sectionSpec}`

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: userText,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        maxOutputTokens: 8000,
        temperature: 0.7,
      },
    }),
  )

  const text = response.text
  if (!text) throw new Error('AI 응답이 비어 있습니다.')
  return JSON.parse(text)
}
