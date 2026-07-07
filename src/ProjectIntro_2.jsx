// ProjectIntro.jsx
// 워밍업 미션 - 프로젝트 소개용 React 컴포넌트 (외부 라이브러리 없이 React만 사용)
// 사용법: src/ 폴더에 넣고 App.jsx 에서 import 하여 <ProjectIntro /> 로 렌더링

import React from "react";

function Screen({ tab, num, label, highlight, children }) {
  return (
    <div className="flow-item">
      <div className={"device" + (highlight ? " hl" : "")}>
        <div className="dbar">
          <span className="ddot" /><span className="ddot" /><span className="ddot" />
          <span className="dtab">{tab}</span>
        </div>
        <div className="dbody">{children}</div>
      </div>
      <div className="dlabel"><span className="dnum">{num}</span>{label}</div>
    </div>
  );
}

function Conn({ label }) {
  return (
    <div className="conn">
      <div className="clabel">{label}</div>
      <div className="carrow">→</div>
    </div>
  );
}

function Chk({ on, children }) {
  return (
    <div className="chk"><span className={"cb" + (on ? " on" : "")}>{on ? "✓" : ""}</span>{children}</div>
  );
}

export default function ProjectIntro() {
  const features = [
    {
      color: "var(--sky)",
      tag: "기능 A",
      title: "성향 기반 공부·스트레스 분석",
      desc: "MBTI(초기 선호 가설)와 짧은 설문을 결합해 집중 방식·계획 선호·스트레스 반응을 8개 지표로 점수화합니다.",
    },
    {
      color: "var(--slate)",
      tag: "기능 B",
      title: "맞춤 공부·회복 루틴 추천",
      desc: "검증된 학습 전략(인출·분산·자기설명)을 성향에 맞는 전달 방식으로 바꿔, 공부법 TOP 3와 오늘의 20분 루틴을 제안합니다.",
    },
  ];

  const stack = [
    ["프론트엔드", "Next.js · TypeScript · Tailwind"],
    ["데이터", "localStorage (MVP)"],
    ["추천 로직", "규칙 기반 (scoring · recommendations)"],
    ["시각화", "Recharts (선택)"],
  ];

  return (
    <div className="psm-root">
      <style>{`
        .psm-root{
          --bg:#F3F6FA;--surface:#FFFFFF;--ink:#1F2A37;--sub:#5B6B7B;--faint:#9AA7B4;
          --line:#E3E9F0;--sky:#4E8FCB;--skyBg:#E9F2FB;--skyInk:#2C6699;--slate:#64748B;
          background:var(--bg);color:var(--ink);min-height:100vh;
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans KR',sans-serif;
          -webkit-font-smoothing:antialiased;padding:56px 20px;
        }
        .psm-wrap{max-width:900px;margin:0 auto;}
        .psm-kicker{width:40px;height:4px;border-radius:99px;background:var(--sky);margin-bottom:18px;}
        .psm-title{font-size:44px;line-height:1.12;font-weight:700;letter-spacing:-.5px;margin:0 0 14px;}
        .psm-tagline{font-size:18px;color:var(--sub);line-height:1.65;margin:0;max-width:660px;}
        .psm-principle{margin-top:28px;border:1px solid var(--line);border-left:3px solid var(--sky);
          background:var(--surface);border-radius:0 12px 12px 0;padding:18px 22px;font-size:15px;line-height:1.65;
          box-shadow:0 1px 2px rgba(31,42,55,.04);}
        .psm-principle b{color:var(--skyInk);font-weight:600;}
        .psm-section{margin-top:44px;}
        .psm-label{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600;letter-spacing:.3px;margin-bottom:16px;}
        .psm-dot{width:8px;height:8px;border-radius:99px;display:inline-block;}
        .psm-card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:24px 26px;
          box-shadow:0 1px 2px rgba(31,42,55,.04);}
        .psm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;}
        .psm-feat{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:24px;
          box-shadow:0 1px 2px rgba(31,42,55,.04);transition:transform .18s ease, border-color .18s ease;}
        .psm-feat:hover{transform:translateY(-2px);border-color:#C7D7E8;}
        .psm-feat .tag{font-size:12px;font-weight:600;letter-spacing:.5px;margin-bottom:8px;}
        .psm-feat h3{font-size:17px;font-weight:600;margin:0 0 10px;}
        .psm-feat p{font-size:14px;line-height:1.6;color:var(--sub);margin:0;}

        .flow{display:flex;align-items:stretch;overflow-x:auto;padding:4px 2px 12px;}
        .flow-item{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;width:158px;}
        .device{width:158px;min-height:236px;background:var(--surface);border:1px solid var(--line);
          border-radius:16px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 2px 6px rgba(31,42,55,.05);}
        .device.hl{border-color:var(--sky);box-shadow:0 0 0 1px var(--sky),0 4px 10px rgba(78,143,203,.18);}
        .dbar{display:flex;align-items:center;gap:5px;padding:9px 12px;background:var(--skyBg);border-bottom:1px solid var(--line);}
        .ddot{width:6px;height:6px;border-radius:99px;background:#B9CEE4;}
        .dtab{margin-left:6px;font-size:10.5px;color:var(--skyInk);font-weight:600;}
        .dbody{padding:13px;display:flex;flex-direction:column;gap:9px;flex:1;}
        .dlabel{margin-top:12px;font-size:12px;font-weight:600;color:var(--ink);display:flex;align-items:center;gap:6px;text-align:center;}
        .dnum{font-size:10px;font-weight:700;color:#fff;background:var(--sky);border-radius:99px;padding:2px 6px;}
        .conn{flex:0 0 auto;width:54px;min-height:236px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;}
        .conn .clabel{font-size:10px;color:var(--faint);text-align:center;line-height:1.3;}
        .conn .carrow{color:#9EC0E1;font-size:18px;font-weight:700;}
        .loopnote{margin-top:14px;font-size:12px;color:var(--skyInk);border:1px dashed var(--sky);border-radius:10px;
          padding:9px 14px;display:inline-block;background:var(--skyBg);}

        .mh{font-size:11px;font-weight:700;color:var(--ink);}
        .ln{height:8px;border-radius:4px;background:#EAEFF5;}
        .chips{display:grid;grid-template-columns:1fr 1fr;gap:5px;}
        .chip{font-size:10px;padding:3px 0;border-radius:6px;background:var(--skyBg);color:var(--skyInk);
          border:1px solid #D3E4F5;text-align:center;font-weight:600;}
        .wchip{font-size:10px;padding:5px 7px;border-radius:6px;background:#fff;color:var(--sub);
          border:1px dashed #C6D5E6;text-align:center;}
        .scale{display:flex;gap:4px;}
        .scale i{width:9px;height:9px;border-radius:99px;background:#DDE7F1;}
        .scale i.on{background:var(--sky);}
        .bar{display:flex;align-items:center;gap:6px;}
        .bar .bl{font-size:9.5px;color:var(--sub);width:30px;}
        .bar .bt{flex:1;height:7px;border-radius:4px;background:#EAEFF5;overflow:hidden;}
        .bar .bf{height:100%;border-radius:4px;background:var(--sky);}
        .chk{display:flex;align-items:center;gap:6px;font-size:10px;color:var(--sub);}
        .chk .cb{width:13px;height:13px;border-radius:99px;border:1.5px solid #C6D5E6;display:inline-flex;
          align-items:center;justify-content:center;font-size:8px;color:#fff;flex:0 0 auto;}
        .chk .cb.on{background:var(--sky);border-color:var(--sky);}
        .timer{font-size:13px;font-weight:700;color:var(--sky);}

        .psm-stack{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;}
        .psm-stack .k{font-size:13px;color:var(--sub);margin-bottom:4px;}
        .psm-stack .v{font-size:14px;font-weight:600;}
        .psm-goal{margin-top:20px;font-size:14px;line-height:1.6;color:var(--sub);}
        .psm-goal b{color:var(--ink);font-weight:600;}
        .psm-foot{margin-top:36px;text-align:center;font-size:12px;color:var(--faint);}
        @media(max-width:640px){.psm-title{font-size:32px;}.psm-root{padding:40px 16px;}}
      `}</style>

      <div className="psm-wrap">
        <header>
          <div className="psm-kicker" />
          <h1 className="psm-title">나만의 공부 사용설명서</h1>
          <p className="psm-tagline">
            MBTI 기반 공부 성향·스트레스 회복 코칭 웹앱 (MVP) — 나에게 맞게, 오래 지속되는 공부를 찾습니다.
          </p>
          <div className="psm-principle">
            <b>추천의 효과는 인지과학이 보증하고, MBTI·설문은 전달 방식만 조정합니다.</b>
            <br />
            공부법 자체는 검증된 학습 원리에서 가져오고, 성향은 "어떻게 적용할지"만 개인화합니다.
          </div>
        </header>

        <section className="psm-section">
          <div className="psm-label"><span className="psm-dot" style={{ background: "var(--sky)" }} />문제 정의</div>
          <div className="psm-card" style={{ fontSize: 15, lineHeight: 1.7 }}>
            시험·자격증·전공 공부를 준비하는 학습자가 자신의 성향과 스트레스 반응을 모른 채 남들이 좋다는 공부법을
            따라 하다가 <b style={{ color: "var(--ink)" }}>집중 저하 · 계획 실패 · 자책 · 번아웃</b>을 반복합니다.
          </div>
        </section>

        <section className="psm-section">
          <div className="psm-label"><span className="psm-dot" style={{ background: "var(--slate)" }} />핵심 기능 (MVP 2개)</div>
          <div className="psm-grid">
            {features.map((f) => (
              <div className="psm-feat" key={f.tag}>
                <div className="tag" style={{ color: f.color }}>{f.tag}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="psm-section">
          <div className="psm-label"><span className="psm-dot" style={{ background: "var(--sky)" }} />사용자 흐름 · 입력에서 코칭까지</div>
          <div className="flow">
            <Screen tab="온보딩" num="01" label="온보딩">
              <div className="mh">MBTI 선택</div>
              <div className="chips">
                <div className="chip">INTJ</div><div className="chip">ENFP</div>
                <div className="chip">ISFP</div><div className="chip">ESTJ</div>
              </div>
              <div className="wchip">모름 → 12문항 성향</div>
            </Screen>
            <Conn label="성향 입력" />
            <Screen tab="설문" num="02" label="공부·스트레스 설문">
              <div className="mh">공부 습관</div>
              <div className="ln" style={{ width: "85%" }} />
              <div className="scale"><i className="on" /><i className="on" /><i className="on" /><i /><i /></div>
              <div className="ln" style={{ width: "70%" }} />
              <div className="scale"><i className="on" /><i className="on" /><i /><i /><i /></div>
              <div style={{ fontSize: 9.5, color: "var(--faint)" }}>1~5점 척도</div>
            </Screen>
            <Conn label="응답 완료" />
            <Screen tab="결과" num="03" label="성향 결과">
              <div className="mh">8지표 점수</div>
              <div className="bar"><span className="bl">집중</span><span className="bt"><span className="bf" style={{ width: "78%" }} /></span></div>
              <div className="bar"><span className="bl">계획</span><span className="bt"><span className="bf" style={{ width: "56%" }} /></span></div>
              <div className="bar"><span className="bl">회복</span><span className="bt"><span className="bf" style={{ width: "42%" }} /></span></div>
            </Screen>
            <Conn label="결과 확인" />
            <Screen tab="루틴" num="04" label="오늘의 20분 루틴">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="mh">오늘 20분</div><div className="timer">20:00</div>
              </div>
              <Chk on>인출 연습 5분</Chk>
              <Chk>개념 정리 10분</Chk>
              <Chk>회복 브레이크 3분</Chk>
            </Screen>
            <Conn label="실행·기록" />
            <Screen tab="코치" num="05" label="AI 코치 피드백" highlight>
              <div className="mh" style={{ color: "var(--sky)" }}>AI 코치</div>
              <div className="ln" style={{ width: "90%" }} />
              <Chk on>인출 연습 완료</Chk>
              <Chk>회복 브레이크</Chk>
              <div style={{ fontSize: 10, color: "var(--skyInk)", fontWeight: 600 }}>다음 루틴 조정 →</div>
            </Screen>
          </div>
          <div className="loopnote">실행 기록 → 규칙 기반 조정 → 내일 루틴 · (확장) LLM AI 코치</div>
        </section>

        <section className="psm-section">
          <div className="psm-label"><span className="psm-dot" style={{ background: "var(--slate)" }} />기술 스택 · MVP 목표</div>
          <div className="psm-card">
            <div className="psm-stack">
              {stack.map(([k, v]) => (
                <div key={k}>
                  <div className="k">{k}</div>
                  <div className="v">{v}</div>
                </div>
              ))}
            </div>
            <div className="psm-goal">
              <b>MVP 목표:</b> 사용자가 5분 안에 진단을 끝내고, 오늘 바로 실천할 공부·회복 루틴을 얻는다.
            </div>
          </div>
        </section>

        <footer className="psm-foot">
          MBTI는 판정 도구가 아니라 선호 탐색의 출발점입니다 · 추천 근거는 인지과학 기반 학습 전략입니다
        </footer>
      </div>
    </div>
  );
}
