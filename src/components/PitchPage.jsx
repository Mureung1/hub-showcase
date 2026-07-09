import Logo from './Logo.jsx';
import { FolderIcon, DocumentIcon } from './FileIcons.jsx';
import './PitchPage.css';

export default function PitchPage({ onStart }) {
  return (
    <div className="pitch-page">

      {/* Header */}
      <header className="pitch-header">
        <div className="pitch-header-brand">
          <div className="traffic-lights">
            <span className="dot red"></span>
            <span className="dot yellow"></span>
            <span className="dot green"></span>
          </div>
          <Logo size={30} />
        </div>
        <div className="pitch-header-menu">
          <span>File</span><span>Edit</span><span>View</span><span>Go</span><span>Window</span><span>Help</span>
        </div>
        <div className="pitch-header-actions">
          <button type="button" className="btn-ghost">로그인</button>
          <button type="button" className="btn-primary" onClick={onStart}>지금 만들어보기 →</button>
        </div>
      </header>

      {/* Hero (전체 화면, 좌우 여백 없이 뷰포트 전체 활용) */}
      <section className="pitch-hero">
        <div className="pitch-hero-inner">
          <div className="pitch-hero-copy">
            <div className="eyebrow">AI Agent Challenge Proposal</div>
            <h1 className="pitch-headline">
              What is<br />
              <span className="highlight">Portfolio</span> Agent<span className="cursor-blink"></span><br />
              <span className="pixel">CORE?</span>
            </h1>
            <p className="pitch-subhead">
              근거 기반 AI 에이전트를 활용한 JD 맞춤형 포트폴리오 자동 생성 서비스
              <FolderIcon size={20} className="inline-icon" />
            </p>
            <button type="button" className="btn-primary hero-cta" onClick={onStart}>지금 만들어보기 →</button>
          </div>

          {/* 콜라주 카드 — 정렬된 2x2 그리드로 오른쪽 공간을 채워 좌우 여백을 없앰 */}
          <div className="pitch-hero-collage">
            <div className="float-card float-notify">
              <div className="icon">🤖</div>
              <div className="txt"><strong>Evidence First</strong>근거 없는 경험은 생성하지 않아요</div>
            </div>

            <div className="float-card float-folders">
              <div className="folder-chip">
                <FolderIcon size={28} />
                <span className="label">Repo Data</span>
              </div>
              <div className="folder-chip">
                <FolderIcon size={28} />
                <span className="label">JD Text</span>
              </div>
            </div>

            <div className="float-card float-controls">
              <div className="control-row">
                <span className="sq" style={{ background: 'var(--color-primary)' }}>🐙</span>
                <span className="label">GitHub<span className="sub">연동됨</span></span>
              </div>
              <div className="control-row">
                <span className="sq" style={{ background: 'var(--color-primary-muted)' }}>
                  <DocumentIcon size={12} tone="white" />
                </span>
                <span className="label">JD 분석<span className="sub">대기 중</span></span>
              </div>
              <div className="control-row">
                <span className="sq" style={{ background: 'var(--color-primary-hover)' }}>✅</span>
                <span className="label">Evidence<span className="sub">검증됨</span></span>
              </div>
            </div>

            <div className="float-card float-dialog">
              <p className="msg">지금까지 만든 포트폴리오를<br />저장하시겠습니까?</p>
              <div className="actions">
                <button className="cancel" type="button">Cancel</button>
                <button className="discard" type="button">Don&apos;t Save</button>
                <button className="save" type="button">Save</button>
              </div>
            </div>
          </div>
        </div>

        <div className="scroll-cue">
          <span>더 알아보기</span>
          <span>↓</span>
        </div>
      </section>

      {/* 01. Background — 스크롤해야 보이는 영역 */}
      <section className="pitch-section alt">
        <div className="pitch-section-inner">
          <div className="section-label">01. Background &amp; Problem</div>
          <h2 className="section-title">
            "수시 채용 시대, 공고마다 포트폴리오를 새로 고쳐 써야 하는 번거로움"
          </h2>
          <div className="card-grid">
            <div className="card">
              <div className="card-index">01. 반복적 피로</div>
              <p className="card-text">지원하는 기업의 JD 스택에 맞춰 매번 포트폴리오를 수정해야 하는 극심한 시간 소요</p>
            </div>
            <div className="card">
              <div className="card-index">02. 판단의 한계</div>
              <p className="card-text">나의 수많은 경험 중 해당 기업 공고에 어떤 프로젝트를 강조해야 할지 기준 부재</p>
            </div>
            <div className="card">
              <div className="card-index">03. 낮은 AI 신뢰도</div>
              <p className="card-text">기존 AI 도구의 가짜 경력 생성 및 어색한 문체로 인한 서류 신뢰도 저하</p>
            </div>
          </div>
        </div>
      </section>

      {/* 02. Core Goal */}
      <section className="pitch-section">
        <div className="pitch-section-inner">
          <div className="section-label">02. Core Goal</div>
          <h2 className="section-title">
            "실제 데이터 기반의 거짓 없는 맞춤형 슬라이드 빌드"
          </h2>

          <div className="flow-panel">
            <div className="flow-meta">
              <span>INPUT DATA</span>
              <span>⚙️ AGENT PROCESS</span>
              <span>OUTPUT</span>
            </div>
            <div className="flow-steps">
              <div className="flow-step">
                <div className="flow-step-label">사용자 입력 데이터</div>
                <div className="tag-row">
                  <span className="tag"><FolderIcon size={13} tone="white" className="inline-icon" />GitHub Repo</span>
                  <span className="tag"><FolderIcon size={13} tone="white" className="inline-icon" />Base Resume</span>
                  <span className="tag"><DocumentIcon size={13} tone="white" className="inline-icon" />Target JD</span>
                </div>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <p className="flow-action-title">근거 기반 매칭</p>
                <p className="flow-action-desc">실제 코드 경력만 추출하여 JD와 가장 적합한 프로젝트 자동 선정 및 포트폴리오 형태로 변환</p>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step" style={{ flex: '0 0 auto' }}>
                <span className="flow-output-badge">
                  <FolderIcon size={14} tone="white" className="inline-icon" />
                  Portfolio 생성
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer strip */}
      <section className="pitch-section alt" style={{ paddingTop: 0 }}>
        <div className="pitch-strip">
          <div className="strip-nav">
            <span className="active">Overview</span>
            <span>Features</span>
            <span>Docs</span>
          </div>
          <div className="strip-date">지금 만들어보기</div>
          <div className="strip-folder">
            <FolderIcon size={18} tone="white" />
          </div>
        </div>
      </section>

    </div>
  );
}
