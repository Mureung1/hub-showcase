import { Link, Navigate, useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getRecommendation } from '../api/index.js'
import { DIFFICULTY_META, LANGUAGE_CLASSES, TAG_CLASSES, formatStars } from '../utils/format.js'

function Detail() {
  const { recommendation, selectedItem } = useOutletContext()

  // 이슈 LLM 분석(#6)은 상세 진입 시점에만 지연 생성 — 목록 화면의 recommendation/selectedItem
  // state는 건드리지 않고 이 화면 안에서만 결과를 들고 있는다(재방문 시 재요청은 캐시 정책이 알아서 처리)
  const { data, isLoading } = useQuery({
    queryKey: ['recommendationAnalysis', recommendation?.id, selectedItem?.repoFullName, selectedItem?.issueNumber],
    queryFn: () =>
      getRecommendation(recommendation.id, {
        repoFullName: selectedItem.repoFullName,
        issueNumber: selectedItem.issueNumber,
      }),
    enabled: Boolean(recommendation?.id && selectedItem),
    staleTime: 5 * 60 * 1000,
  })
  const analyzed = data?.items.find(
    (item) => item.repoFullName === selectedItem?.repoFullName && item.issueNumber === selectedItem?.issueNumber,
  )

  if (!selectedItem) {
    return <Navigate to="/result" replace />
  }

  const badge = DIFFICULTY_META[selectedItem.difficulty]
  const langClass = LANGUAGE_CLASSES[selectedItem.primaryLanguage] ?? ''
  const meta = [
    { k: '필요 기술', v: selectedItem.primaryLanguage },
    { k: '난이도', v: badge.label },
    { k: '매칭 점수', v: `${selectedItem.matchScore}점` },
  ]

  return (
    <div className="panel">
      <div className="d-repo">
        <span className={`lang ${langClass}`}>
          <span className="sw" />
          {selectedItem.primaryLanguage}
        </span>{' '}
        · {selectedItem.repoFullName} <span className="inum">#{selectedItem.issueNumber}</span> ·{' '}
        <span className="star">★</span> {formatStars(selectedItem.repoStars)}
      </div>
      <h1 className="d-title">{selectedItem.issueTitle}</h1>
      <div className="tags">
        <span className={`badge badge-${badge.tone}`}>{badge.label}</span>
        {selectedItem.labels.map((label) => (
          <span key={label} className={TAG_CLASSES[label] ? `tag ${TAG_CLASSES[label]}` : 'tag'}>
            {label}
          </span>
        ))}
      </div>

      <div className="meta">
        {meta.map((cell) => (
          <div className="cell" key={cell.k}>
            <div className="k">{cell.k}</div>
            <div className="v">{cell.v}</div>
          </div>
        ))}
      </div>

      <div className="d-body">
        <div className="why why-detail">
          <span className="ic">↣</span>
          <div>
            <b>왜 나에게 맞나요?</b> {selectedItem.reason}
          </div>
        </div>
        {selectedItem.repoDescription && (
          <>
            <h3>레포 소개</h3>
            <p>{selectedItem.repoDescription}</p>
          </>
        )}

        {analyzed?.issueSummary && (
          <>
            <h3>이슈 요약</h3>
            <p>{analyzed.issueSummary}</p>
          </>
        )}
        {analyzed?.requiredSkills?.length > 0 && (
          <div className="tags">
            {analyzed.requiredSkills.map((skill) => (
              <span key={skill} className="tag">
                {skill}
              </span>
            ))}
          </div>
        )}

        <h3>기여 시작 가이드</h3>
        {isLoading ? (
          <p className="d-analyzing">
            <span className="spinner" /> 이슈를 분석하고 있어요
          </p>
        ) : analyzed?.guide?.length > 0 ? (
          <ol className="guide">
            {analyzed.guide.map((step, index) => (
              <li key={step} data-n={index + 1}>
                {step}
              </li>
            ))}
          </ol>
        ) : (
          <p className="d-analyzing">분석 준비 중이에요. 이슈 본문을 직접 확인해보셔도 좋아요.</p>
        )}
      </div>

      <div className="d-actions">
        <a
          className="btn btn-primary btn-lg"
          href={selectedItem.issueUrl}
          target="_blank"
          rel="noreferrer"
        >
          GitHub에서 이슈 보기 ↗
        </a>
        <Link to="/result" className="btn btn-soft btn-lg">
          다른 이슈 보기
        </Link>
      </div>
    </div>
  )
}

export default Detail
