import { Link } from 'react-router-dom'
import { templates } from '../data/templates.js'
import './pages.css'

function TemplatePickerPage() {
  return (
    <section>
      <header className="rs-page-head">
        <h1>작성하기</h1>
        <p>
          직군별 템플릿으로 시작하세요. 템플릿은 정답이 아니라 출발점입니다 — 섹션은 언제든
          추가·삭제·이름 변경할 수 있어요.
        </p>
      </header>

      <div className="rs-grid">
        {templates.map((template) => (
          <Link key={template.id} to={`/write/${template.id}`} className="rs-card rs-doc-card">
            <h3 className="rs-doc-card-title">{template.name}</h3>
            <p className="rs-doc-card-meta">{template.tagline}</p>
            <p className="rs-doc-card-stats">
              {template.examples} · 섹션 {template.sections.length}개 프리셋
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default TemplatePickerPage
