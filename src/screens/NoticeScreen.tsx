import { ChevronRight } from 'lucide-react'
import { ScreenHeader } from '../components/ScreenHeader'
import type { Notice } from '../types/festival'

type NoticeScreenProps = {
  notice: Notice | null
  notices: Notice[]
  onBack: () => void
  onSelectNotice: (notice: Notice) => void
}

export function NoticeScreen({
  notice,
  notices,
  onBack,
  onSelectNotice,
}: NoticeScreenProps) {
  if (notice) {
    return <NoticeDetail notice={notice} onBack={onBack} />
  }

  return (
    <section className="screen" aria-labelledby="notice-list-title">
      <ScreenHeader
        description="일정 변경과 운영 안내를 확인하세요."
        title="공지사항"
      />
      <div className="row-list">
        {notices.map((item) => (
          <button
            className="notice-row"
            key={item.id}
            onClick={() => onSelectNotice(item)}
            type="button"
          >
            <div>
              {item.important && <span className="tag important">중요</span>}
              <h3>{item.title}</h3>
              <p>
                {item.author} · {item.date}
              </p>
            </div>
            <ChevronRight aria-hidden="true" size={22} />
          </button>
        ))}
      </div>
    </section>
  )
}

function NoticeDetail({
  notice,
  onBack,
}: {
  notice: Notice
  onBack: () => void
}) {
  return (
    <article className="screen detail-screen" aria-labelledby="notice-title">
      <button className="back-button" onClick={onBack} type="button">
        이전
      </button>
      {notice.important && <span className="tag important">중요</span>}
      <h2 id="notice-title">{notice.title}</h2>
      <p className="notice-meta">
        {notice.author} · {notice.date}
      </p>
      <p className="notice-body">{notice.body}</p>
    </article>
  )
}
