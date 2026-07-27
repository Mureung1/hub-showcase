// 기획서 AI 자동 피드백 (기획서 §3.4). LLM 호출은 여기(backend)에서만 한다.
// 무료 티어 Google Gemini. 짧은 섹션별 코멘트 + 전체 총평을 구조적 출력(responseSchema)으로 강제.
// kind로 두 모드를 분기한다: 'reverse'(기존 게임 역기획) / 'forward'(오리지널 순기획).
// 섹션은 짧은 필드(fields) 또는 content 문자열 어느 쪽이든 받는다.
import { GoogleGenAI, Type } from '@google/genai'

// 무료 티어에서 쓰는 기본 모델. 품질/속도를 바꾸려면 이 값만 바꾼다.
const MODEL = process.env.AI_FEEDBACK_MODEL ?? 'gemini-2.5-flash'

// 두 모드 공통 출력 규칙 — 짧게(속도·피로도). 섹션마다 서로 다른 내용, 실제 표현 인용.
const OUTPUT_RULES = `# 각 섹션 코멘트(content) 형식 — 아래 3줄을 그대로(줄바꿈 포함)
👍 강점: ...
🔧 개선점: ...
💡 제안: ...
- 각 줄 1~2문장으로 짧고 구체적으로. 장황 금지.
- 작성자가 쓴 실제 표현/필드 값을 지목해 말한다(막연한 칭찬·일반론 금지).
- 빈 섹션/필드면 강점 대신 "아직 비어 있음"을 알리고, 무엇을 어떻게 채우면 되는지 제안에 담는다.
- 섹션마다 내용이 서로 달라야 한다. 어디에나 붙는 보일러플레이트 금지.
- 전체 총평(overall)은 3~4문장: 이 문서만의 강점 1~2개 + 우선 개선점 1~2개 + 다음 스텝 한 문장.
- 모두 한국어. 존중하되 실무 멘토처럼 구체적으로.`

const REVERSE_PROMPT = `너는 실무 경력 있는 게임 기획자이자 "역기획서" 멘토다.
역기획서는 이미 나온 게임의 시스템을 기획자의 눈으로 분해·분석하는 문서다.

# 좋은 역기획서의 기준 — 이 기준으로 평가한다
1) 관찰 → 추론: "게임이 이렇다"에서 멈추지 않고 "왜 이렇게 설계했을까"까지 간다.
2) 구체성: 모호한 말 대신 수치·조건·비율로(모르면 추정치임을 밝히고라도).
3) 구조 완결성: 그 섹션이 다뤄야 할 핵심 요소가 빠지지 않았다.
4) 예외/엣지: 경계 상황(부족/중단/최대치/네트워크 등)을 따진다.
5) 도메인 렌즈: 밸런싱·게임 경제(공급-소모 싱크)·리텐션·UX 정보위계 중 섹션에 맞는 렌즈로 본다.
- 게임의 사실관계(수치가 실제로 맞는지)는 평가하지 않는다. 문서의 구조·서술·설계 관점만 본다.

${OUTPUT_RULES}`

const FORWARD_PROMPT = `너는 실무 경력 있는 게임 기획자이자 "오리지널 기획안(순기획)" 멘토다.
순기획서는 아직 없는 게임을 직접 설계해 제안하는 문서다.

# 좋은 기획안의 기준 — 이 기준으로 평가한다
1) 피치 명확성: 한 줄 소개만 읽어도 무슨 게임인지, 무엇이 핵심인지 잡히는가.
2) 차별성(USP): 기존 게임과 결정적으로 다른 점이 분명한가(레퍼런스 나열에 그치지 않는가).
3) 실현가능성·스코프: 규모가 현실적인가, "안 할 것"으로 스코프를 지키는가.
4) 타깃 적합: 겨냥한 유저층과 장르·플랫폼·재미가 서로 맞물리는가.
5) 내적 일관성: 콘셉트·시스템·세계관·BM이 서로 모순 없이 한 방향을 보는가.
6) 재미 가설: "왜 재밌는가"에 대한 구체적 가설(핵심 루프·한 방)이 있는가.
- 시장 성공 여부·매출 규모는 단정하지 않는다. 설계의 명료함·일관성·차별성만 본다.

${OUTPUT_RULES}`

// 채점 스키마 조각 — 챌린지 제출(criteria 있음)일 때만 붙인다.
const SCORE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    total: { type: Type.INTEGER },
    criteria: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          score: { type: Type.INTEGER },
        },
        required: ['label', 'score'],
      },
    },
    reason: { type: Type.STRING },
  },
  required: ['total', 'criteria', 'reason'],
}

function buildResponseSchema(withScore) {
  const properties = {
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
  }
  const required = ['sectionComments', 'overall']
  if (withScore) {
    properties.score = SCORE_SCHEMA
    required.push('score')
  }
  return { type: Type.OBJECT, properties, required }
}

// 채점 기준을 [{label, weight}] 형태로 정규화. 옛 문자열 배열도 받아준다(하위호환).
export function normalizeCriteria(criteria) {
  if (!Array.isArray(criteria)) return []
  return criteria.map((c) => (typeof c === 'string' ? { label: c } : c)).filter((c) => c && c.label)
}

// 채점 결과를 상세의 "AI 채점" 패널에 보여줄 한 덩어리 텍스트로. (순수 함수 — 테스트 대상)
// criteria(배점)를 함께 주면 "22/30"처럼 배점 대비로 보여준다.
export function formatScoreComment(score, criteria) {
  const weightByLabel = new Map(normalizeCriteria(criteria).map((c) => [c.label, c.weight]))
  const lines = [`총점 ${score.total}/100`]
  for (const c of score.criteria ?? []) {
    const weight = weightByLabel.get(c.label)
    lines.push(`· ${c.label}: ${c.score}${weight != null ? `/${weight}` : ''}`)
  }
  if (score.reason) lines.push(`한줄평: ${score.reason}`)
  return lines.join('\n')
}

// 섹션 본문 텍스트: 짧은 필드(fields)가 있으면 라벨: 값으로, 없으면 content 문자열로.
function sectionBody(s) {
  if (Array.isArray(s.fields) && s.fields.length > 0) {
    return s.fields
      .map((f) => `- ${f.label}: ${(f.value ?? '').trim() || '(비어 있음)'}`)
      .join('\n')
  }
  return s.content?.trim() || '(비어 있음)'
}

// sections: [{ key, heading, content?, fields?, guide? }], meta: { title, gameTag, templateName, kind }
export async function generateAiFeedback(sections, meta = {}) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    const e = new Error('GEMINI_API_KEY 가 설정되지 않았습니다.')
    e.status = 503
    throw e
  }
  const ai = new GoogleGenAI({ apiKey })

  const isForward = meta.kind === 'forward'
  const criteria = normalizeCriteria(meta.criteria)
  const withScore = criteria.length > 0
  const basePrompt = isForward ? FORWARD_PROMPT : REVERSE_PROMPT
  const docWord = isForward ? '기획안' : '역기획서'

  // 장르 렌즈 — 같은 역기획이라도 장르마다 봐야 할 것이 다르다.
  const lens = Array.isArray(meta.genreLens) ? meta.genreLens.filter(Boolean) : []
  const lensBlock =
    lens.length > 0
      ? `

# 장르 관점 (이 게임의 장르에서 특히 중요한 것)
- 아래 관점이 문서에서 다뤄졌는지 확인하고, 빠졌다면 개선점·제안에서 짚는다.
- ${lens.join(' / ')}`
      : ''

  // 챌린지 제출이면 공개된 배점(weight)대로 채점하게 지시한다.
  const rubricLine = criteria
    .map((c) => `${c.label}(${c.weight != null ? `${c.weight}점 만점` : '균등 배분'})`)
    .join(' / ')
  const scoreBlock = withScore
    ? `

# 채점 (이 문서는 챌린지 제출작이다)
- 아래 각 기준을 **그 기준의 만점 안에서** 매기고, 합을 total(0~100)로 낸다.
- score.criteria 의 label 은 주어진 기준 문구를 **그대로** 쓴다(만점 표기는 빼고 라벨만).
- reason 은 그렇게 준 이유를 한 줄로. 절대 평가가 아니라 참고 점수임을 전제로 근거를 구체적으로.
- 채점 기준: ${rubricLine}`
    : ''

  const systemInstruction = `${basePrompt}${lensBlock}${scoreBlock}`

  const docText = sections
    .map((s) => {
      const guideLine = s.guide ? `이 섹션이 다뤄야 하는 것: ${s.guide}\n` : ''
      return `### [${s.key}] ${s.heading}\n${guideLine}작성자가 쓴 내용:\n${sectionBody(s)}`
    })
    .join('\n\n')

  const templateLine = meta.templateName ? ` · 유형: ${meta.templateName}` : ''
  const scoreLine = withScore ? ' 그리고 채점 기준별 점수와 총점(score)을 매겨라.' : ''
  const userText = `다음은 "${meta.title ?? '제목 없음'}" (${isForward ? '가제/장르' : '대상 게임'}: ${meta.gameTag ?? '미지정'}${templateLine}) ${docWord}다.
각 섹션의 "다뤄야 하는 것"과 "작성자가 쓴 내용"을 비교해, 섹션에 특화된 짧은 코멘트(👍 강점 / 🔧 개선점 / 💡 제안)를 단다. 작성자의 실제 표현을 지목하고, 섹션마다 서로 다른 내용을 쓴다. 마지막에 이 문서만의 전체 총평을 써라.${scoreLine} sectionKey로 원문의 [key]를 그대로 쓴다.

${docText}`

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: userText,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: buildResponseSchema(withScore),
      // 2.5-flash는 thinking 토큰도 maxOutputTokens에서 차감된다 → 켜두면 출력이 잘려 JSON이 깨진다.
      // 구조적 피드백엔 깊은 추론이 불필요하므로 thinking을 끄고(속도↑) 예산을 전부 출력에 쓴다.
      thinkingConfig: { thinkingBudget: 0 },
      // 채점(score)이 붙으면 출력이 길어지므로 여유를 더 준다.
      maxOutputTokens: withScore ? 4000 : 3000,
      temperature: 0.7,
    },
  })

  const text = response.text
  if (!text) {
    throw new Error('AI 응답을 해석할 수 없어요.')
  }
  // 혹시라도 출력이 잘려 JSON이 깨지면 삼키지 말고 명확히 알린다(정형 문구로 오인 방지).
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('AI 응답이 잘렸어요. 잠시 후 다시 시도해 주세요.')
  }
}
