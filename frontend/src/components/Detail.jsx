import { Link, Navigate, useOutletContext } from 'react-router-dom'
import { DIFFICULTY_META, LANGUAGE_CLASSES, TAG_CLASSES, formatStars } from '../utils/format.js'

// 6 · 추천 상세 — 첫 기여 공통 가이드 (이슈별 데이터 아님)
const GUIDE = [
  '레포를 포크하고 로컬에 클론해요.',
  '이슈 본문과 코멘트를 읽고 수정 범위를 파악해요.',
  '변경 후 동작을 확인하고 PR을 올려요.',
]

function Detail() {
  const { selectedItem } = useOutletContext()

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
        <div className="why" style={{ marginBottom: '20px' }}>
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
        <h3>기여 시작 가이드</h3>
        <ol className="guide">
          {GUIDE.map((item, index) => (
            <li key={item} data-n={index + 1}>
              {item}
            </li>
          ))}
        </ol>
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
