import './App.css'

const availability = [
  [1, 2, 3, 4, 2],
  [2, 3, 4, 4, 3],
  [0, 1, 2, 3, 4],
  [1, 1, 2, 2, 1],
  [3, 4, 4, 3, 2],
  [2, 2, 3, 4, 4],
]
const days = ['월', '화', '수', '목', '금']

const tasks = [
  { title: '주제 선정 & 역할 분담', assignee: '지훈', status: '완료', due: '6/12' },
  { title: '설문 문항 설계', assignee: '수아', status: '진행중', due: '6/20' },
  { title: '발표 자료 초안', assignee: '민재', status: '진행중', due: '6/27' },
  { title: '최종 리허설', assignee: '하늘', status: '예정', due: '7/2' },
]

const contributions = [
  { name: '지훈', value: 82 },
  { name: '수아', value: 65 },
  { name: '민재', value: 48 },
  { name: '하늘', value: 34 },
]

const comparison = [
  { label: '시간 조율', when2meet: true, trello: false, ours: true },
  { label: '태스크 관리', when2meet: false, trello: true, ours: true },
  { label: '기여도 확인', when2meet: false, trello: false, ours: true },
  { label: '대학 팀플 흐름에 최적화', when2meet: false, trello: false, ours: true },
]

function App() {
  return (
    <>
      <header className="topbar">
        <span className="brand">🧩 팀플 올인원</span>
      </header>

      <section id="center" className="hero">
        <h1>팀플 올인원</h1>
        <p className="subtitle">진행 트래커 + 회의시간 매칭</p>
        <p className="lede">기능을 모은 게 아니라, 팀플의 실제 흐름을 따라 만든 도구</p>
      </section>

      <div className="ticks"></div>

      <section id="features">
        <h2 className="section-title">핵심 기능</h2>
        <div className="feature-grid">
          <article className="feature-card">
            <h3>회의시간 매칭</h3>
            <p>조원들의 가능 시간을 격자로 입력받아 겹치는 시간을 색으로 시각화</p>
            <div className="grid-preview" aria-hidden="true">
              <div className="grid-preview-labels">
                {days.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="grid-preview-cells">
                {availability.map((row, i) => (
                  <div className="grid-preview-row" key={i}>
                    {row.map((v, j) => (
                      <div key={j} className={`cell level-${v}`} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="feature-card">
            <h3>태스크 관리</h3>
            <p>할 일과 담당자, 마감일, 진행 상태 관리</p>
            <ul className="task-preview" aria-hidden="true">
              {tasks.map((t) => (
                <li key={t.title} className="task-row">
                  <span className={`status-dot status-${t.status}`} />
                  <span className="task-title">{t.title}</span>
                  <span className="task-assignee">{t.assignee}</span>
                  <span className="task-due">{t.due}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="feature-card">
            <h3>기여도 시각화</h3>
            <p>활동 기록 기반으로 누가 얼마나 기여했는지 차트로 표시</p>
            <div className="chart-preview" aria-hidden="true">
              {contributions.map((c) => (
                <div className="chart-bar-wrap" key={c.name}>
                  <div className="chart-bar" style={{ height: `${c.value}%` }} />
                  <span className="chart-label">{c.name}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <div className="ticks"></div>

      <section id="diff">
        <h2 className="section-title">왜 팀플 올인원인가</h2>
        <p className="diff-lede">
          when2meet(시간 조율만)과 Trello(태스크만)를 대학 팀플에 맞게 하나로 합쳤어요
        </p>
        <table className="diff-table">
          <thead>
            <tr>
              <th></th>
              <th>when2meet</th>
              <th>Trello</th>
              <th className="ours-col">팀플 올인원</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.when2meet ? '✓' : '–'}</td>
                <td>{row.trello ? '✓' : '–'}</td>
                <td className="ours-col">{row.ours ? '✓' : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section id="spacer"></section>
    </>
  )
}

export default App
