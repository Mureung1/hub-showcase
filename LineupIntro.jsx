import { useState } from "react";

/**
 * 프로젝트 소개 컴포넌트 — "라인업(Lineup)"
 * 취준생을 위한 AI 직무 추천: 프로필(포트폴리오·자격증·학교·학과)을 종합 분석해
 * 지금의 커리어와 잘 맞는 공고부터 적합도 순으로 줄 세워 보여줍니다.
 *
 * '라인업'은 자리표시용 제품명입니다 — 원하는 이름으로 바꿔서 쓰세요.
 */

const PROFILE = [
  { k: "학교", v: "전남대학교" },
  { k: "전공", v: "컴퓨터공학" },
  { k: "자격증", v: "정보처리기사" },
  { k: "포트폴리오", v: "3건" },
];

const JOBS = [
  {
    company: "카카오페이",
    role: "백엔드 엔지니어",
    match: 96,
    reasons: ["Spring Boot · JPA 실무", "MySQL 18테이블 ERD 설계", "정보처리기사"],
  },
  {
    company: "당근",
    role: "풀스택 개발자",
    match: 91,
    reasons: ["Java + React 병행", "SSE 실시간 알림 구현"],
  },
  {
    company: "토스",
    role: "플랫폼 엔지니어",
    match: 83,
    reasons: ["Redis 분산 락 설계", "대규모 트래픽 관심"],
  },
  {
    company: "라인",
    role: "프론트엔드 개발자",
    match: 76,
    reasons: ["React · Vite · styled-components", "반응형 UI 구현"],
  },
  {
    company: "쿠팡",
    role: "데이터 엔지니어",
    match: 64,
    reasons: ["SQL · 데이터 모델링", "가중치 스코어링 설계"],
  },
];

export default function LineupIntro() {
  const [runId, setRunId] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);

  const reanalyze = () => {
    if (analyzing) return;
    setAnalyzing(true);
    setRunId((n) => n + 1);
    window.setTimeout(() => setAnalyzing(false), 1250);
  };

  return (
    <div className="lu">
      <style>{CSS}</style>

      <div className="lu-stage">
        <header className="lu-head">
          <span className="lu-eyebrow">AI CAREER MATCH · 라인업</span>
          <h1 className="lu-title">
            관심 직무를 고르지 마세요.
            <br />
            <span className="lu-title-accent">공고가 당신에게 맞춰 줄을 섭니다.</span>
          </h1>
          <p className="lu-sub">
            포트폴리오, 자격증, 학교와 전공까지 한 번에 분석합니다. 필터를 하나씩
            켤 필요 없이, 지금의 커리어와 가장 잘 맞는 공고부터 순서대로 보여줍니다.
          </p>
        </header>

        <div className="lu-demo">
          {/* 프로필 패널 */}
          <aside className="lu-profile">
            <div className="lu-panel-label">입력 · 내 프로필</div>
            <ul className="lu-chips">
              {PROFILE.map((p) => (
                <li key={p.k} className="lu-chip">
                  <span className="lu-chip-k">{p.k}</span>
                  <span className="lu-chip-v">{p.v}</span>
                </li>
              ))}
            </ul>
            <button
              className="lu-btn"
              onClick={reanalyze}
              disabled={analyzing}
              aria-live="polite"
            >
              {analyzing ? (
                <>
                  <span className="lu-dot" /> 적합도 분석 중…
                </>
              ) : (
                "다시 분석하기"
              )}
            </button>
            <p className="lu-note">
              같은 프로필도 공고 풀이 바뀌면 순위가 달라집니다.
            </p>
          </aside>

          {/* 랭킹 피드 */}
          <section className="lu-feed" aria-label="적합도 순 추천 공고">
            <div className="lu-feed-head">
              <span className="lu-panel-label">출력 · 추천 공고</span>
              <span className="lu-feed-sub">커리어 적합도 순</span>
            </div>

            <ol className="lu-list" key={runId}>
              {JOBS.map((job, i) => (
                <li
                  key={job.company}
                  className={"lu-row" + (i === 0 ? " lu-row--top" : "")}
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  <div className="lu-rank">{String(i + 1).padStart(2, "0")}</div>

                  <div className="lu-body">
                    <div className="lu-row-top">
                      <div className="lu-role-wrap">
                        <span className="lu-role">{job.role}</span>
                        <span className="lu-company">{job.company}</span>
                      </div>
                      <span className="lu-match">{job.match}%</span>
                    </div>

                    <div className="lu-bar">
                      <div
                        className="lu-bar-fill"
                        style={{ "--w": job.match + "%", animationDelay: `${i * 90 + 160}ms` }}
                      />
                    </div>

                    <ul className="lu-reasons">
                      {job.reasons.map((r) => (
                        <li key={r} className="lu-reason">
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* 기존 방식 vs 라인업 */}
        <div className="lu-contrast">
          <div className="lu-card lu-card--old">
            <span className="lu-card-label">기존 취업 사이트</span>
            <p className="lu-card-text">
              직무 카테고리를 직접 고르고, 필터를 하나씩 켜고, 수백 개 공고를 손으로
              넘겨봐야 했습니다.
            </p>
            <div className="lu-filters">
              {["백엔드", "프론트", "서울", "신입", "정규직", "+12"].map((f) => (
                <span key={f} className="lu-filter">
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div className="lu-card lu-card--new">
            <span className="lu-card-label">라인업</span>
            <p className="lu-card-text">
              프로필을 통째로 읽고, 지금 커리어에 맞는 순서로 공고를 정렬합니다.
              무엇을 골라야 할지 고민할 필요가 없습니다.
            </p>
            <div className="lu-mini">
              <span className="lu-mini-bar" style={{ "--w": "94%" }} />
              <span className="lu-mini-bar" style={{ "--w": "78%" }} />
              <span className="lu-mini-bar" style={{ "--w": "61%" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans+KR:wght@300;400;500;600;700&display=swap');

.lu{
  --ink:#0B0D12; --surface:#12151D; --surface-2:#171B24; --line:#242B38;
  --text:#EEF1F6; --muted:#828C9E; --faint:#59606F;
  --violet:#8B7CF6; --cyan:#43E3CC; --amber:#FFB25C;
  --grad:linear-gradient(90deg,var(--cyan),var(--violet));
  --font-kr:'IBM Plex Sans KR',system-ui,sans-serif;
  --font-dp:'Space Grotesk','IBM Plex Sans KR',sans-serif;
  background:var(--ink);
  color:var(--text);
  font-family:var(--font-kr);
  -webkit-font-smoothing:antialiased;
  padding:clamp(28px,5vw,72px) clamp(18px,4vw,48px);
  line-height:1.5;
}
.lu *{box-sizing:border-box;margin:0;padding:0;}
.lu-stage{max-width:1080px;margin:0 auto;}

/* header */
.lu-head{max-width:760px;}
.lu-eyebrow{
  font-family:var(--font-dp);font-size:12px;font-weight:600;
  letter-spacing:.24em;text-transform:uppercase;color:var(--cyan);
  animation:lu-up .6s ease both;
}
.lu-title{
  font-size:clamp(30px,5.2vw,54px);font-weight:700;line-height:1.1;
  letter-spacing:-.02em;margin-top:18px;color:var(--text);
  animation:lu-up .6s ease .06s both;
}
.lu-title-accent{
  background:var(--grad);-webkit-background-clip:text;background-clip:text;
  -webkit-text-fill-color:transparent;
}
.lu-sub{
  margin-top:20px;font-size:16px;color:var(--muted);max-width:56ch;
  animation:lu-up .6s ease .12s both;
}

/* demo grid */
.lu-demo{
  display:grid;grid-template-columns:300px 1fr;gap:20px;
  margin-top:clamp(36px,5vw,56px);align-items:start;
}
.lu-panel-label{
  font-family:var(--font-dp);font-size:11px;font-weight:600;
  letter-spacing:.18em;text-transform:uppercase;color:var(--faint);
}

/* profile */
.lu-profile{
  background:var(--surface);border:1px solid var(--line);border-radius:16px;
  padding:22px;position:sticky;top:24px;
  animation:lu-up .6s ease .18s both;
}
.lu-chips{list-style:none;display:flex;flex-direction:column;gap:9px;margin:16px 0 20px;}
.lu-chip{
  display:flex;justify-content:space-between;align-items:center;
  background:var(--surface-2);border:1px solid var(--line);border-radius:10px;
  padding:11px 14px;
}
.lu-chip-k{font-size:12px;color:var(--muted);}
.lu-chip-v{font-size:14px;font-weight:500;color:var(--text);}
.lu-btn{
  width:100%;border:none;cursor:pointer;border-radius:10px;
  background:var(--grad);color:#0B0D12;font-family:var(--font-kr);
  font-size:14px;font-weight:600;padding:13px;display:flex;
  align-items:center;justify-content:center;gap:8px;
  transition:transform .15s ease,filter .15s ease;
}
.lu-btn:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.08);}
.lu-btn:disabled{cursor:default;opacity:.85;}
.lu-btn:focus-visible{outline:2px solid var(--cyan);outline-offset:2px;}
.lu-dot{
  width:7px;height:7px;border-radius:50%;background:#0B0D12;
  animation:lu-pulse .7s ease-in-out infinite;
}
.lu-note{margin-top:12px;font-size:12px;color:var(--faint);line-height:1.5;}

/* feed */
.lu-feed{
  background:var(--surface);border:1px solid var(--line);border-radius:16px;
  padding:22px;animation:lu-up .6s ease .24s both;
}
.lu-feed-head{
  display:flex;justify-content:space-between;align-items:baseline;
  padding-bottom:16px;margin-bottom:6px;border-bottom:1px solid var(--line);
}
.lu-feed-sub{font-size:12px;color:var(--muted);}
.lu-list{list-style:none;}
.lu-row{
  display:flex;gap:16px;padding:16px 12px;border-radius:12px;
  border:1px solid transparent;
  animation:lu-rowin .55s cubic-bezier(.22,1,.36,1) both;
  transition:transform .18s ease,background .18s ease,border-color .18s ease;
}
.lu-row:hover{transform:translateX(3px);background:var(--surface-2);border-color:var(--line);}
.lu-row--top{
  background:rgba(139,124,246,.07);
  border-color:rgba(139,124,246,.28);
  box-shadow:0 0 44px -18px rgba(139,124,246,.7);
}
.lu-rank{
  font-family:var(--font-dp);font-size:15px;font-weight:600;
  color:var(--faint);padding-top:2px;min-width:24px;
}
.lu-row--top .lu-rank{color:var(--violet);}
.lu-body{flex:1;min-width:0;}
.lu-row-top{display:flex;justify-content:space-between;align-items:baseline;gap:12px;}
.lu-role-wrap{display:flex;flex-direction:column;gap:2px;min-width:0;}
.lu-role{font-size:16px;font-weight:600;color:var(--text);}
.lu-company{font-size:13px;color:var(--muted);}
.lu-match{
  font-family:var(--font-dp);font-size:20px;font-weight:600;
  color:var(--text);letter-spacing:-.02em;flex-shrink:0;
}
.lu-row--top .lu-match{color:var(--cyan);}
.lu-bar{
  height:6px;background:var(--surface-2);border-radius:99px;
  margin:11px 0 12px;overflow:hidden;
}
.lu-bar-fill{
  height:100%;width:var(--w);border-radius:99px;background:var(--grad);
  animation:lu-fill .85s cubic-bezier(.22,1,.36,1) both;
}
.lu-reasons{list-style:none;display:flex;flex-wrap:wrap;gap:6px;}
.lu-reason{
  font-size:12px;color:var(--muted);background:var(--surface-2);
  border:1px solid var(--line);border-radius:7px;padding:4px 9px;
}

/* contrast */
.lu-contrast{
  display:grid;grid-template-columns:1fr 1fr;gap:16px;
  margin-top:22px;animation:lu-up .6s ease .3s both;
}
.lu-card{border-radius:16px;padding:22px;border:1px solid var(--line);}
.lu-card--old{background:var(--surface);}
.lu-card--new{
  background:linear-gradient(180deg,rgba(139,124,246,.09),rgba(67,227,204,.04));
  border-color:rgba(139,124,246,.28);
}
.lu-card-label{
  font-family:var(--font-dp);font-size:11px;font-weight:600;
  letter-spacing:.18em;text-transform:uppercase;color:var(--faint);
}
.lu-card--new .lu-card-label{color:var(--cyan);}
.lu-card-text{margin:12px 0 18px;font-size:14px;color:var(--muted);line-height:1.6;}
.lu-filters{display:flex;flex-wrap:wrap;gap:7px;}
.lu-filter{
  font-size:12px;color:var(--faint);border:1px dashed var(--line);
  border-radius:7px;padding:5px 10px;text-decoration:line-through;
  text-decoration-color:var(--faint);opacity:.7;
}
.lu-mini{display:flex;flex-direction:column;gap:9px;padding-top:2px;}
.lu-mini-bar{height:8px;width:var(--w);border-radius:99px;background:var(--grad);}

/* motion */
@keyframes lu-up{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:none;}}
@keyframes lu-rowin{from{opacity:0;transform:translateX(-16px);}to{opacity:1;transform:none;}}
@keyframes lu-fill{from{width:0;}to{width:var(--w);}}
@keyframes lu-pulse{0%,100%{opacity:1;}50%{opacity:.3;}}

@media (max-width:760px){
  .lu-demo{grid-template-columns:1fr;}
  .lu-profile{position:static;}
  .lu-contrast{grid-template-columns:1fr;}
}
@media (prefers-reduced-motion:reduce){
  .lu *{animation:none!important;transition:none!important;}
}
`;
