import { useState } from 'react'
import { ChevronLeft, Highlighter } from 'lucide-react'
import type { Article } from '../components/ArticleCard'
import './Read.css'

// 원문을 문장 단위로 나눈 것. 하이라이트가 문장 단위로 걸리기 때문이다.
// 실제로는 백엔드가 이 형태로 내려주거나, 프론트에서 문장 분리를 해야 한다.
const SENTENCES = [
  '틱톡과 릴스 같은 숏폼 콘텐츠는 15초 안에 결론부터 보여주도록 설계되어 있다.',
  '덕분에 우리는 어떤 정보든 빠르게 훑을 수 있게 됐지만, 끝까지 읽지 않아도 다 안 것 같은 착각도 함께 커진다.',
  '실제로 한 연구는 짧은 영상에 익숙해질수록 긴 글의 논증을 끝까지 따라가는 능력이 떨어진다고 보고했다.',
  '이런 소비 방식은 읽은 직후 내 언어로 다시 정리하는 습관이 있을 때만 실제 이해로 이어진다.',
  '결국 문제는 콘텐츠의 길이가 아니라, 내가 그 콘텐츠에 무엇을 더했는지다.',
  '정보를 많이 담는 것과 하나를 오래 붙드는 것은 전혀 다른 일이다.',
]

type ReadProps = {
  article: Article
  onBack: () => void
  // 하이라이트한 문장들을 부모에게 넘긴다. 미션을 어떤 문장으로 낼지는 부모가 정한다.
  onRequestMission: (highlightedSentences: string[]) => void
}

export default function Read({ article, onBack, onRequestMission }: ReadProps) {
  const [highlightedIndexes, setHighlightedIndexes] = useState<number[]>([])

  const highlightCount = highlightedIndexes.length
  const canRequestMission = highlightCount > 0

  function toggleHighlight(index: number) {
    setHighlightedIndexes((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index],
    )
  }

  function handleRequestMission() {
    const sentences = highlightedIndexes.map((index) => SENTENCES[index])
    onRequestMission(sentences)
  }

  return (
    <div className="app-shell">
      <header className="screen-header">
        <div className="header-side">
          <button
            className="icon-btn"
            type="button"
            aria-label="뒤로가기"
            onClick={onBack}
          >
            <ChevronLeft />
          </button>
          <h1>{article.sourceName}</h1>
        </div>
        <div className="header-side header-side--right">
          <span className="highlight-count">
            <Highlighter />
            {highlightCount}
          </span>
        </div>
      </header>

      <main className="screen-main">
        <p className="card-meta read-source">
          {article.sourceName}
          <span className="dot" />
          {article.contentTypeLabel}
          <span className="topic-tag">{article.interestName}</span>
        </p>

        <h2 className="read-title">{article.title}</h2>

        <p className="read-hint">
          <Highlighter />
          인상 깊은 문장을 눌러 형광펜으로 칠해보세요
        </p>

        <p className="read-body">
          {SENTENCES.map((sentence, index) => {
            const isHighlighted = highlightedIndexes.includes(index)

            return (
              <button
                key={sentence}
                type="button"
                className={`sentence${isHighlighted ? ' sentence--highlighted' : ''}`}
                aria-pressed={isHighlighted}
                onClick={() => toggleHighlight(index)}
              >
                {sentence}{' '}
              </button>
            )
          })}
        </p>
      </main>

      <footer className="screen-footer">
        <button
          type="button"
          className="btn-primary"
          disabled={!canRequestMission}
          onClick={handleRequestMission}
        >
          {canRequestMission ? '오늘의 미션 받기' : '한 문장이라도 칠해보세요'}
        </button>
      </footer>
    </div>
  )
}
