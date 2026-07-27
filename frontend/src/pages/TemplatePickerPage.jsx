import { useState } from 'react'
import { Link } from 'react-router-dom'
import { templates, reverseTemplates, forwardTemplates } from '../data/templates.js'
import { games, systemsByGame } from '../data/gameSystems.js'
import './pages.css'

// 템플릿 카드 하나(역기획/순기획 공통).
function TemplateCard({ template }) {
  return (
    <Link to={`/write/${template.id}`} className="rs-card rs-doc-card">
      <h3 className="rs-doc-card-title">{template.name}</h3>
      <p className="rs-doc-card-meta">{template.tagline}</p>
      <p className="rs-doc-card-stats">
        {template.examples} · 섹션 {template.sections.length}개 프리셋
      </p>
    </Link>
  )
}

function TemplatePickerPage() {
  // 게임을 먼저 고르면 시스템 목록이 열리고, 시스템을 고르면 템플릿·태그가 정해진 채로 에디터로 간다.
  const [game, setGame] = useState(null)
  const systems = game ? systemsByGame(game) : []

  return (
    <section>
      <header className="rs-page-head">
        <h1>작성하기</h1>
        <p>
          이미 나온 게임을 분석하려면 <strong>역기획</strong>, 내 오리지널 게임을 제안하려면{' '}
          <strong>순기획</strong>으로 시작하세요. 어떤 틀이든 섹션은 짧은 항목으로 나뉘어 있어 한
          칸씩 채우면 됩니다.
        </p>
      </header>

      {/* ── 역기획: 게임에서 고르기(카탈로그) ── */}
      <div className="rs-home-section">
        <div className="rs-home-section-head">
          <h2>역기획 · 게임에서 고르기</h2>
          {game && (
            <button type="button" className="rs-chip" onClick={() => setGame(null)}>
              게임 다시 고르기
            </button>
          )}
        </div>
        <p className="rs-compare-hint">
          고르면 템플릿과 태그가 자동으로 맞춰지고, 같은 시스템의 예시 역기획서도 함께 볼 수 있어요.
        </p>

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

      {/* ── 역기획: 템플릿에서 바로 시작 ── */}
      <div className="rs-home-section">
        <div className="rs-home-section-head">
          <h2>역기획 · 템플릿에서 시작</h2>
        </div>
        <p className="rs-compare-hint">
          다루려는 게임이 목록에 없다면 템플릿으로 바로 시작하세요. 섹션은 언제든 추가·삭제할 수
          있어요.
        </p>
        <div className="rs-grid">
          {reverseTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      </div>

      {/* ── 순기획: 내 오리지널 기획안 ── */}
      <div className="rs-home-section">
        <div className="rs-home-section-head">
          <h2>순기획 · 내 오리지널 기획안</h2>
        </div>
        <p className="rs-compare-hint">
          아직 없는 게임을 직접 설계해 발표하고 평가받아 보세요. 처음이라면{' '}
          <strong>원페이지 피치</strong>가 가장 가볍습니다.
        </p>
        <div className="rs-grid">
          {forwardTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default TemplatePickerPage
