import { callClaudeTool } from './claude.client.js'

const KEYWORD_CATEGORIES = ['맛', '친절도', '대기시간', '가격', '청결도', '분위기', '일반']

const SOLUTION_MAP = {
  맛: '메뉴 맛의 일관성을 점검하고, 레시피 표준화나 조리 담당자 교육을 고려해보세요.',
  친절도: '직원 응대 교육을 강화하고, 정기적인 서비스 피드백 세션을 진행해보세요.',
  대기시간: '피크타임 인력 배치를 조정하거나, 예약/웨이팅 시스템 도입을 검토해보세요.',
  가격: '가격 대비 만족도를 높일 수 있도록 메뉴 구성이나 프로모션을 재검토해보세요.',
  청결도: '위생 점검 주기를 단축하고, 매장 청소 체크리스트를 도입해보세요.',
  분위기: '조명, 음악, 좌석 배치 등 매장 분위기 요소를 점검하고 개선해보세요.',
  일반: '구체적인 원인 파악을 위해 추가 피드백을 요청하거나 직접 문의해보세요.',
}

// 리뷰 하나를 분석시킬 때 Claude에게 강제하는 응답 스키마 (기획서.md 8-2).
const REVIEW_ANALYSIS_TOOL = {
  name: 'submit_review_analysis',
  description: '리뷰 하나를 분석한 결과를 제출한다',
  input_schema: {
    type: 'object',
    properties: {
      sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
      keywords: {
        type: 'array',
        items: { type: 'string', enum: KEYWORD_CATEGORIES },
        minItems: 1,
        maxItems: 3,
      },
      replyDrafts: {
        type: 'object',
        properties: {
          polite: { type: 'string' },
          friendly: { type: 'string' },
          concise: { type: 'string' },
        },
        required: ['polite', 'friendly', 'concise'],
      },
    },
    required: ['sentiment', 'keywords', 'replyDrafts'],
  },
}

function suggestImprovement(sentiment, keyword) {
  if (sentiment !== 'negative') return null
  return SOLUTION_MAP[keyword] || SOLUTION_MAP['일반']
}

export function suggestionForKeyword(keyword) {
  return SOLUTION_MAP[keyword] || SOLUTION_MAP['일반']
}

const SCORE_BASE = { positive: 10, neutral: 40, negative: 70 }

// 리뷰마다 매기는 "관심 필요도" 점수(0~100). API로 요청하지 않고 로컬에서 계산한다 —
// 같은 입력에도 AI가 매번 다른 점수를 낼 수 있어(비결정적) 총 분석·정렬이 불안정해지기 때문(기획서.md 8-3).
function computeScore(sentiment, keywords) {
  const base = SCORE_BASE[sentiment]
  const bonus = sentiment === 'negative' ? Math.min((keywords.length - 1) * 10, 20) : 0
  return Math.min(base + bonus, 100)
}

async function analyzeOne(text, index) {
  const { sentiment, keywords, replyDrafts } = await callClaudeTool({
    tool: REVIEW_ANALYSIS_TOOL,
    userMessage: `다음 손님 리뷰를 분석해서 submit_review_analysis 도구로 결과를 제출해줘.\n\n리뷰: "${text}"`,
  })

  return {
    reviewId: `r_${String(index + 1).padStart(2, '0')}`,
    originalText: text,
    sentiment,
    keywords,
    score: computeScore(sentiment, keywords),
    improvementSuggestion: suggestImprovement(sentiment, keywords[0]),
    replyDrafts,
  }
}

export async function analyzeReviews(reviews) {
  return Promise.all(reviews.map((text, index) => analyzeOne(text, index)))
}
