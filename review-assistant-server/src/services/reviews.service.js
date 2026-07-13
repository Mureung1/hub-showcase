const KEYWORD_MAP = {
  맛: ['맛있', '맛없', '음식', '메뉴', '양이', '맛도', '맛이', '맛은'],
  친절도: ['친절', '불친절', '사장님', '직원', '무뚝뚝', '응대', '태도'],
  대기시간: ['대기', '기다', '오래', '빠르', '느리', '웨이팅', '줄'],
  가격: ['가격', '비싸', '저렴', '가성비', '값'],
  청결도: ['청결', '깨끗', '더럽', '위생'],
  분위기: ['분위기', '인테리어', '자리', '시끄럽', '조용'],
}

const POSITIVE_WORDS = [
  '좋아요', '좋았', '맛있', '친절', '최고', '만족', '감사', '추천', '훌륭', '깨끗', '빠르', '재방문', '또 올',
]

const NEGATIVE_WORDS = [
  '별로', '불친절', '오래', '대기', '실망', '최악', '비싸', '더럽', '불만', '느리', '불편', '맛없', '무뚝뚝',
  '쓰레기', '노맛', '맛도 없', '맛이 없', '맛은 없', '엉망', '성의 없', '정성 없',
]

const NEGATION_PREFIXES = ['불', '안', '못']

const SOLUTION_MAP = {
  맛: '메뉴 맛의 일관성을 점검하고, 레시피 표준화나 조리 담당자 교육을 고려해보세요.',
  친절도: '직원 응대 교육을 강화하고, 정기적인 서비스 피드백 세션을 진행해보세요.',
  대기시간: '피크타임 인력 배치를 조정하거나, 예약/웨이팅 시스템 도입을 검토해보세요.',
  가격: '가격 대비 만족도를 높일 수 있도록 메뉴 구성이나 프로모션을 재검토해보세요.',
  청결도: '위생 점검 주기를 단축하고, 매장 청소 체크리스트를 도입해보세요.',
  분위기: '조명, 음악, 좌석 배치 등 매장 분위기 요소를 점검하고 개선해보세요.',
  일반: '구체적인 원인 파악을 위해 추가 피드백을 요청하거나 직접 문의해보세요.',
}

// '불친절' 처럼 부정어에 긍정 단어가 포함된 경우, 앞에 부정 접두사가 붙은 자리는 긍정으로 세지 않는다.
function countPositiveMatches(text, words) {
  return words.reduce((acc, word) => {
    let idx = text.indexOf(word)
    let matched = false
    while (idx !== -1) {
      const prevChar = idx > 0 ? text[idx - 1] : ''
      if (!NEGATION_PREFIXES.includes(prevChar)) {
        matched = true
        break
      }
      idx = text.indexOf(word, idx + 1)
    }
    return acc + (matched ? 1 : 0)
  }, 0)
}

function classifySentiment(text) {
  const posScore = countPositiveMatches(text, POSITIVE_WORDS)
  const negScore = NEGATIVE_WORDS.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0)
  if (posScore > negScore) return 'positive'
  if (negScore > posScore) return 'negative'
  return 'neutral'
}

function extractKeywords(text) {
  const keywords = Object.entries(KEYWORD_MAP)
    .filter(([, triggers]) => triggers.some((t) => text.includes(t)))
    .map(([label]) => label)
  return keywords.length > 0 ? keywords.slice(0, 3) : ['일반']
}

function suggestImprovement(sentiment, keyword) {
  if (sentiment !== 'negative') return null
  return SOLUTION_MAP[keyword] || SOLUTION_MAP['일반']
}

export function suggestionForKeyword(keyword) {
  return SOLUTION_MAP[keyword] || SOLUTION_MAP['일반']
}

const SCORE_BASE = { positive: 10, neutral: 40, negative: 70 }

// 리뷰마다 매기는 "관심 필요도" 점수(0~100). 부정적일수록, 겹치는 문제 키워드가 많을수록 높다.
function computeScore(sentiment, keywords) {
  const base = SCORE_BASE[sentiment]
  const bonus = sentiment === 'negative' ? Math.min((keywords.length - 1) * 10, 20) : 0
  return Math.min(base + bonus, 100)
}

function buildReplyDrafts(sentiment, keyword) {
  if (sentiment === 'positive') {
    return {
      polite: `소중한 후기 남겨주셔서 진심으로 감사드립니다. 말씀해주신 ${keyword} 부분, 앞으로도 변함없이 유지하겠습니다.`,
      friendly: '우와 이렇게 좋은 말씀 남겨주셔서 너무 감사해요! 다음에 또 뵙고 싶어요 :)',
      concise: '감사합니다! 또 뵙겠습니다.',
    }
  }
  if (sentiment === 'negative') {
    return {
      polite: `불편을 드려 진심으로 죄송합니다. 말씀해주신 ${keyword} 부분은 꼭 개선하도록 노력하겠습니다.`,
      friendly: `아이고 ${keyword} 때문에 많이 아쉬우셨겠어요 ㅠㅠ 다음엔 더 신경 쓸게요!`,
      concise: '죄송합니다. 개선하겠습니다.',
    }
  }
  return {
    polite: `소중한 의견 남겨주셔서 감사합니다. ${keyword} 관련 말씀 참고하여 더 나은 모습 보이겠습니다.`,
    friendly: '방문해주셔서 감사해요! 다음에도 편하게 놀러 오세요~',
    concise: '감사합니다!',
  }
}

function analyzeOne(text, index) {
  const sentiment = classifySentiment(text)
  const keywords = extractKeywords(text)
  return {
    reviewId: `r_${String(index + 1).padStart(2, '0')}`,
    originalText: text,
    sentiment,
    keywords,
    score: computeScore(sentiment, keywords),
    improvementSuggestion: suggestImprovement(sentiment, keywords[0]),
    replyDrafts: buildReplyDrafts(sentiment, keywords[0]),
  }
}

export function analyzeReviews(reviews) {
  return reviews.map((text, index) => analyzeOne(text, index))
}
