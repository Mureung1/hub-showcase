// 역기획서 AI 자동 피드백 (기획서 §3.4). LLM 호출은 여기(backend)에서만 한다.
// 무료 티어를 쓸 수 있는 Google Gemini로 구현. 짧은 섹션별 코멘트 + 전체 총평을
// 구조적 출력(responseSchema)으로 강제한다.
// 피드백 관점 4종: 구조 완결성 / 구체성 / 예외 질문 / 역기획 관점. 게임 사실관계는 평가하지 않는다.
import { GoogleGenAI, Type } from '@google/genai'

// 무료 티어에서 쓰는 기본 모델. 품질/속도를 바꾸려면 이 값만 바꾼다.
const MODEL = process.env.AI_FEEDBACK_MODEL ?? 'gemini-2.5-flash'

const SYSTEM_PROMPT = `너는 실무 경력 있는 게임 기획자이자 "역기획서" 멘토다.
역기획서는 이미 나온 게임의 시스템을 기획자의 눈으로 분해·분석하는 문서다.

# 좋은 역기획서(섹션)의 기준 — 이 기준으로 평가한다
1) 관찰 → 추론: "게임이 이렇다"(관찰)에서 멈추지 않고 "왜 이렇게 설계했을까"(의도 추론)까지 간다.
2) 구체성: "확률이 낮다/보상이 좋다" 같은 모호한 말 대신 수치·조건·비율로 쓴다(모르면 추정치임을 밝히고라도).
3) 구조 완결성: 그 섹션이 다뤄야 할 핵심 요소가 빠지지 않았다(예: 데이터 구조라면 테이블·컬럼·타입·제약, 밸런스라면 곡선·변곡점·튜닝 레버).
4) 예외/엣지: 경계 상황(부족/중단/최대치/네트워크 등)에서의 동작을 따진다.
5) 도메인 렌즈: 시스템 밸런싱, 게임 경제/BM(재화의 공급-소모 싱크), 리텐션 훅, UX 정보위계/피드백 — 섹션 성격에 맞는 렌즈로 본다.

# 각 섹션에 대해 반드시 아래 4가지를 모두 수행한다
- 섹션의 목적 파악: heading + (주어졌다면) guide + **작성자가 쓴 내용**으로 이 섹션이 무엇을 다루는지 스스로 판단한다. guide가 없거나 일반적이면 heading·내용으로 추론한다.
- 강점(👍): 작성자가 잘한 점을 **실제 문장을 지목/인용**해 구체적으로 칭찬한다. (막연한 칭찬 금지)
- 개선점(🔧): 위 "좋은 기준"에 비춰 빠졌거나 얕은 부분을 근거와 함께 짚는다.
- 제안(💡): 다음에 무엇을 어떻게 보강할지 실행 가능한 구체안이나 답할 만한 질문을 준다(가능하면 수치·예시·항목 형태).

# 출력 형식(각 섹션 코멘트 content)
아래 3줄 라벨 형식을 그대로 쓴다(줄바꿈 포함):
👍 강점: ...
🔧 개선점: ...
💡 제안: ...
- 각 줄은 1~3문장. 전체적으로 상세하되 장황하지 않게.
- 빈 섹션이면 강점 대신 "아직 비어 있음"을 알리고, 개선점·제안에서 이 섹션에 무엇을 어떻게 채우면 되는지 구체적으로 안내한다.

# 규칙
- **섹션마다 내용이 서로 달라야 한다.** 어느 문서·어느 섹션에나 붙는 보일러플레이트 문장은 금지.
- 게임의 사실관계(수치가 실제로 맞는지 등)는 평가하지 않는다. 문서의 구조·서술·설계 관점만 본다.
- 전체 총평(overall)은 4~5문장. 이 문서만의 가장 큰 강점 1~2개와 우선 개선점 1~2개를 구체적으로 짚고, 다음 스텝을 한 문장으로 제안한다.
- 모두 한국어. 존중하되 두루뭉술하지 않게, 실무 멘토처럼 구체적으로.`

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    sectionComments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sectionKey: { type: Type.STRING },
          content: { type: Type.STRING },
        },
        required: ['sectionKey', 'content'],
      },
    },
    overall: { type: Type.STRING },
  },
  required: ['sectionComments', 'overall'],
}

// sections: [{ key, heading, content, guide? }]
export async function generateAiFeedback(sections, meta = {}) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    const e = new Error('GEMINI_API_KEY 가 설정되지 않았습니다.')
    e.status = 503
    throw e
  }
  const ai = new GoogleGenAI({ apiKey })

  // 각 섹션 블록에 "이 섹션의 목적(guide)"과 "작성자가 쓴 내용(content)"을 함께 넣는다.
  // guide가 있어야 모델이 섹션 성격에 맞는 특화 피드백을 할 수 있다.
  const docText = sections
    .map((s) => {
      const guideLine = s.guide ? `이 섹션이 다뤄야 하는 것: ${s.guide}\n` : ''
      return `### [${s.key}] ${s.heading}\n${guideLine}작성자가 쓴 내용:\n${s.content?.trim() || '(비어 있음)'}`
    })
    .join('\n\n')

  const templateLine = meta.templateName ? ` · 유형: ${meta.templateName}` : ''
  const userText = `다음은 "${meta.title ?? '제목 없음'}" (대상 게임: ${meta.gameTag ?? '미지정'}${templateLine}) 역기획서다.
각 섹션마다 "다뤄야 하는 것"과 "작성자가 쓴 내용"을 비교해, 그 섹션에 특화된 상세 코멘트(👍 강점 / 🔧 개선점 / 💡 제안)를 단다. 작성자의 실제 표현을 지목/인용하고, 섹션마다 서로 다른 내용을 쓴다. 마지막에 이 문서만의 전체 총평을 써라. 섹션은 sectionKey로 원문의 [key]를 그대로 쓴다.

${docText}`

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: userText,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      // 강점/개선점/제안 3단 상세 코멘트라 출력이 길다.
      maxOutputTokens: 4000,
      // 매번 동일한 문장이 반복되지 않도록 약간의 다양성.
      temperature: 0.7,
    },
  })

  const text = response.text
  if (!text) {
    throw new Error('AI 응답을 해석할 수 없어요.')
  }
  return JSON.parse(text)
}
