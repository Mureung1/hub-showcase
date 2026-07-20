const EXAMPLE_PRESETS = [
  {
    label: '대기시간 불만 예시',
    reviews: ['너무 오래 기다렸어요. 대기시간이 길었습니다.', '웨이팅이 30분 넘게 걸려서 불편했어요.'],
  },
  {
    label: '친절도 칭찬 예시',
    reviews: ['직원분이 정말 친절하고 좋았어요.', '사장님이 너무 친절하셔서 재방문 의사 있어요.'],
  },
  {
    label: '여러 리뷰 섞어보기',
    reviews: [
      '음식은 맛있었는데 너무 오래 기다렸어요.',
      '직원분이 너무 불친절했어요.',
      '가격 대비 만족스러웠어요.',
    ],
  },
]

function ReviewInputForm({ value, onChange, onAnalyze, loading, lineCount, showTips }) {
  return (
    <>
      <div className="input-card">
        <label className="input-label" htmlFor="review-input">리뷰 붙여넣기</label>
        <div className="example-chip-row">
          <span className="example-chip-label">예시로 빠르게 체험해보기:</span>
          {EXAMPLE_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.label}
              className="example-chip"
              onClick={() => onChange(preset.reviews.join('\n'))}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <textarea
          id="review-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={'예) 음식은 맛있었는데 너무 오래 기다렸어요.\n직원분이 너무 불친절했어요.\n(리뷰 하나당 한 줄, 최대 15개)'}
        />
        <div className="hint">
          <span>줄바꿈으로 리뷰를 구분해주세요 · 최대 15개</span>
          <span>{lineCount}개 입력됨</span>
        </div>
        <button className="analyze-btn" onClick={onAnalyze} disabled={loading}>
          {loading ? '분석 중...' : '분석 시작'}
        </button>
      </div>

      {showTips && (
        <div className="tips-box">
          <div className="tips-title">💡 이렇게 입력하면 더 정확해요</div>
          <ul className="tips-list">
            <li>리뷰 하나당 한 줄로 입력해주세요</li>
            <li>&quot;친절&quot;, &quot;대기시간&quot;, &quot;가격&quot;처럼 구체적인 표현이 있으면 키워드를 더 잘 잡아내요</li>
            <li>최대 15개까지 한 번에 분석할 수 있어요</li>
          </ul>
        </div>
      )}
    </>
  )
}

export default ReviewInputForm
