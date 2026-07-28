import { collectJobReferenceLinks } from '../../constants/referenceLinks'
import { useModalA11y } from '../../hooks/useModalA11y'

// 북마크 페이지 전용: 공고 하나에 필요한 참고링크를 전부 모아서 보여주는 팝업 — 상세 모달을 열지 않고도
// 바로 확인할 수 있게, 카드에서 한 번에 접근하는 용도(#25 후속).
function ReferenceLinksModal({ job, onClose }) {
  const boxRef = useModalA11y(Boolean(job), onClose)
  if (!job) return null
  const links = collectJobReferenceLinks(job.checklist)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box reflinks-modal" ref={boxRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <p className="job-title" style={{ marginBottom: 2 }}>
          {job.title}
        </p>
        <p className="job-meta" style={{ marginBottom: 14 }}>
          필요한 사이트 모음
        </p>
        {links.length === 0 ? (
          <p className="checklist-detail">지금 스펙 기준으로 보완이 필요한 항목이 없어요.</p>
        ) : (
          links.map((entry) => (
            <div className="checklist-row" key={entry.category}>
              <div className="checklist-main">
                <span className="checklist-label">{entry.label}</span>
              </div>
              <div className="checklist-reflink">
                <a href={entry.link} target="_blank" rel="noopener noreferrer">
                  관련 사이트 바로가기 →
                </a>
                {entry.caption && <p className="checklist-reflink-caption">{entry.caption}</p>}
              </div>
            </div>
          ))
        )}
        <button className="btn-secondary" style={{ width: '100%', marginTop: 8 }} onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  )
}

export default ReferenceLinksModal
