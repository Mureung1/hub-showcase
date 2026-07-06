import { useState } from 'react'
import './App.css'

const KEYWORD_MAP = {
  맛: ['맛있', '맛없', '음식', '메뉴', '양이'],
  친절도: ['친절', '불친절', '사장님', '직원', '무뚝뚝'],
  대기시간: ['대기', '기다', '오래', '빠르', '느리'],
  가격: ['가격', '비싸', '저렴', '가성비'],
  청결도: ['청결', '깨끗', '더럽', '위생'],
  분위기: ['분위기', '인테리어', '자리'],
}

const POSITIVE_WORDS = [
  '좋아요', '좋았', '맛있', '친절', '최고', '만족', '감사', '추천', '훌륭', '깨끗', '빠르', '재방문', '또 올',
]

const NEGATIVE_WORDS = [
  '별로', '불친절', '오래', '대기', '실망', '최악', '비싸', '더럽', '불만', '느리', '불편', '맛없', '무뚝뚝',
]

function classifySentiment(text) {
  const posScore = POSITIVE_WORDS.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0)
  const negScore = NEGATIVE_WORDS.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0)
  if (posScore > negScore) return '긍정'
  if (negScore > posScore) return '부정'
  return '중립'
}

function extractKeywords(text) {
  const keywords = Object.entries(KEYWORD_MAP)
    .filter(([, triggers]) => triggers.some((t) => text.includes(t)))
    .map(([label]) => label)
  return keywords.length > 0 ? keywords.slice(0, 3) : ['일반']
}

function buildReplies(sentiment, keyword) {
  if (sentiment === '긍정') {
    return {
      정중함: `소중한 후기 남겨주셔서 진심으로 감사드립니다. 말씀해주신 ${keyword} 부분, 앞으로도 변함없이 유지하겠습니다.`,
      친근함: `우와 이렇게 좋은 말씀 남겨주셔서 너무 감사해요! 다음에 또 뵙고 싶어요 :)`,
      간결함: `감사합니다! 또 뵙겠습니다.`,
    }
  }
  if (sentiment === '부정') {
    return {
      정중함: `불편을 드려 진심으로 죄송합니다. 말씀해주신 ${keyword} 부분은 꼭 개선하도록 노력하겠습니다.`,
      친근함: `아이고 ${keyword} 때문에 많이 아쉬우셨겠어요 ㅠㅠ 다음엔 더 신경 쓸게요!`,
      간결함: `죄송합니다. 개선하겠습니다.`,
    }
  }
  return {
    정중함: `소중한 의견 남겨주셔서 감사합니다. ${keyword} 관련 말씀 참고하여 더 나은 모습 보이겠습니다.`,
    친근함: `방문해주셔서 감사해요! 다음에도 편하게 놀러 오세요~`,
    간결함: `감사합니다!`,
  }
}

function analyzeReviewLocally(review) {
  const sentiment = classifySentiment(review)
  const keywords = extractKeywords(review)
  const replies = buildReplies(sentiment, keywords[0])
  return { review, sentiment, keywords, replies }
}

function sentimentClass(sentiment) {
  if (sentiment === '긍정') return 'positive'
  if (sentiment === '부정') return 'negative'
  return 'neutral'
}

function App() {
  const [reviewInput, setReviewInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  async function analyzeReviews() {
    setError('')

    const rawText = reviewInput.trim()
    if (!rawText) {
      setError('리뷰를 먼저 입력해주세요.')
      return
    }

    const reviews = rawText.split('\n').map((r) => r.trim()).filter(Boolean)
    if (reviews.length === 0) {
      setError('유효한 리뷰가 없어요.')
      return
    }
    if (reviews.length > 15) {
      setError('한 번에 최대 15개까지 분석할 수 있어요. 리뷰 수를 줄여주세요.')
      return
    }

    setLoading(true)
    setResults(null)

    await new Promise((resolve) => setTimeout(resolve, 500))
    setResults(reviews.map(analyzeReviewLocally))
    setLoading(false)
  }

  function copyReply(text, replyId) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedId(replyId)
        setTimeout(() => {
          setCopiedId((prev) => (prev === replyId ? null : prev))
        }, 1500)
      })
      .catch(() => {
        setError('복사에 실패했어요. 직접 선택해서 복사해주세요.')
      })
  }

  return (
    <div className="container">
      <header>
        <h1>🍊 리뷰 답변 도우미</h1>
        <p>손님 리뷰를 붙여넣으면 감정 분석과 답변 초안을 만들어드려요</p>
      </header>

      <div className="input-card">
        <textarea
          value={reviewInput}
          onChange={(e) => setReviewInput(e.target.value)}
          placeholder={'리뷰를 한 줄에 하나씩 붙여넣어 주세요.\n예)\n사장님이 너무 친절하고 맛있었어요!\n대기시간이 너무 길어서 아쉬웠어요.'}
        />
        <div className="hint">여러 리뷰는 줄바꿈으로 구분해주세요.</div>
        <button className="analyze-btn" onClick={analyzeReviews} disabled={loading}>
          {loading ? '분석 중...' : '분석 시작'}
        </button>
      </div>

      {loading && <div className="status visible">분석 중이에요, 잠시만 기다려주세요...</div>}
      {error && <div className="error-box visible">{error}</div>}

      <div>
        {results !== null && results.length === 0 && (
          <div className="empty-state">분석 결과가 없어요.</div>
        )}

        {results !== null &&
          results.map((item, idx) => {
            const sClass = sentimentClass(item.sentiment)
            return (
              <div className={`review-card ${sClass}`} key={idx}>
                <div className="review-text">&ldquo;{item.review}&rdquo;</div>
                <div className="meta-row">
                  <span className={`sentiment-tag ${sClass}`}>{item.sentiment || '중립'}</span>
                  {(item.keywords || []).map((keyword, kIdx) => (
                    <span className="keyword-tag" key={kIdx}>
                      {keyword}
                    </span>
                  ))}
                </div>
                {Object.entries(item.replies || {}).map(([label, text], rIdx) => {
                  const replyId = `reply-${idx}-${rIdx}`
                  return (
                    <div className="reply-option" key={replyId}>
                      <span className="reply-label">{label}</span>
                      <div>{text}</div>
                      <button
                        className={`copy-btn ${copiedId === replyId ? 'copied' : ''}`}
                        onClick={() => copyReply(text, replyId)}
                      >
                        {copiedId === replyId ? '복사됨 ✓' : '복사하기'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          })}
      </div>
    </div>
  )
}

export default App
