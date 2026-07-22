import { useState } from 'react'
import { Link } from 'react-router-dom'
import { templates } from '../data/templates.js'
import { games, systemsByGame } from '../data/gameSystems.js'
import './pages.css'

function TemplatePickerPage() {
  // 게임을 먼저 고르면 시스템 목록이 열리고, 시스템을 고르면 템플릿·태그가 정해진 채로 에디터로 간다.
  const [game, setGame] = useState(null)
  const systems = game ? systemsByGame(game) : []

  return (
    <section>
      <header className="rs-page-head">
        <h1>작성하기</h1>
        <p>
          무엇을 쓸지 정하지 못했다면 게임에서 골라보세요. 고르면 템플릿과 태그가 자동으로 맞춰지고,
          같은 시스템의 예시 역기획서도 함께 볼 수 있어요.
        </p>
      </header>

      <div className="rs-home-section">
        <div className="rs-home-section-head">
          <h2>게임에서 고르기</h2>
          {game && (
            <button type="button" className="rs-chip" onClick={() => setGame(null)}>
              게임 다시 고르기
            </button>
          )}
        </div>

        <div className="rs-filter-row" role="group" aria-label="게임 선택">
          {games.map((g) => (
            <button
              key={g.name}
              type="button"
              className={`rs-chip${game === g.name ? ' is-selected' : ''}`}
              onClick={() => setGame(g.name)}
            >
              {g.name}
            </button>
          ))}
        </div>

        {game && (
          <div className="rs-grid">
            {systems.map((s) => (
              <Link
                key={s.id}
                to={`/write/${s.templateId}?game=${encodeURIComponent(s.game)}&system=${encodeURIComponent(s.name)}&category=${encodeURIComponent(s.category)}`}
                className="rs-card rs-doc-card"
              >
                <h3 className="rs-doc-card-title">{s.name}</h3>
                <p className="rs-doc-card-meta">{s.blurb}</p>
                <p className="rs-doc-card-stats">
                  {templates.find((t) => t.id === s.templateId)?.name} · {s.category}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="rs-home-section">
        <div className="rs-home-section-head">
          <h2>템플릿에서 고르기</h2>
        </div>
        <p className="rs-compare-hint">
          다루려는 게임이 목록에 없다면 템플릿으로 바로 시작하세요. 템플릿은 정답이 아니라
          출발점이며, 섹션은 언제든 추가·삭제·이름 변경할 수 있어요.
        </p>
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
      </div>
    </section>
  )
}

export default TemplatePickerPage
