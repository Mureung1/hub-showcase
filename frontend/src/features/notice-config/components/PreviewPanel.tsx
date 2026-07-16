import type {
  DetectedCategory,
  NoticePreview,
} from '../types/noticeConfigTypes'

interface PreviewPanelProps {
  notices: NoticePreview[]
  categories: DetectedCategory[]
}

export function PreviewPanel({ notices, categories }: PreviewPanelProps) {
  if (notices.length === 0) {
    return (
      <section className="preview-panel empty">
        <h2>최근 공지 미리보기</h2>
        <p>테스트 크롤링을 실행하면 추출된 공지와 감지된 카테고리가 표시됩니다.</p>
      </section>
    )
  }

  return (
    <section className="preview-panel">
      <div className="preview-header">
        <h2>최근 공지 미리보기</h2>
        <span>{categories.length}개 카테고리 감지</span>
      </div>
      <div className="notice-list">
        {notices.map((notice) => (
          <article className="notice-preview" key={notice.link}>
            <span>{notice.category}</span>
            <h3>{notice.title}</h3>
            <p>
              {notice.date} · {notice.link}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
