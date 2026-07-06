export default function MaterialsOrchestratorIntro() {
  // ── 스카이블루 팔레트 ──
  const C = {
    ink: "#12314f",       // 본문 진한 남색
    sub: "#5b7085",       // 보조 텍스트
    accent: "#3b82f6",    // 포인트 블루
    accentDeep: "#2563eb",
    accentSoft: "#e8f1ff",
    card: "#ffffff",
    line: "#dbe8fa",
    panel: "rgba(255,255,255,0.72)",
  };

  // 시스템 폰트 우선 (별도 설치 불필요)
  const sans = "system-ui, -apple-system, 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";

  const steps = [
    { no: "STEP 01", title: "추출 · Extract",
      desc: "측정 파일에서 핵심 물성값을 코드로 자동 산출합니다.",
      items: ["J-V 곡선 → Voc · Jsc · FF · PCE 자동 계산",
              "XRD → 결정성 · 격자상수 · 배향 추출",
              "SEM/EDS → 조성비 · 결함 · 표면 형상 정량화"] },
    { no: "STEP 02", title: "진단 · Diagnose",
      desc: "정상 범위와 대조해 이상을 탐지하고 원인 후보를 순위화합니다.",
      items: ["비정상 곡선 · 불량 픽셀 자동 탐지",
              "FF 저하 → 계면 저항 · 핀홀 · 직렬저항 의심",
              "원인 후보 Top-N + 추가 확인 항목 제시"] },
    { no: "STEP 03", title: "대조 · Cross-check",
      desc: "유사 문헌·과거 실험과 대조해 근거와 함께 리포트합니다.",
      items: ["RAG로 관련 논문 · 과거 실험 DB 검색",
              "출처 · 신뢰구간 · 불확실성 명시",
              "엔지니어용 1페이지 리포트 자동 생성"] },
  ];

  const tags = ["J-V curve", "XRD", "SEM/EDS", "RAG", "LangGraph",
                "Python(SciPy)", "Claude API", "React"];

  return (
    <div style={{
      minHeight: "100vh",
      // 은은한 배경 + 방사형 광원 두 개로 깊이감
      background: `
        radial-gradient(900px 500px at 15% 0%, #eaf3ff 0%, transparent 60%),
        radial-gradient(800px 500px at 100% 20%, #e0edff 0%, transparent 55%),
        linear-gradient(180deg, #f7fbff 0%, #eef5ff 100%)`,
      color: C.ink, fontFamily: sans, padding: "72px 20px",
      boxSizing: "border-box",
    }}>
      {/* 콘텐츠를 흰 패널로 띄워 배경이 은은히 비치게 */}
      <div style={{
        maxWidth: 1000, margin: "0 auto",
        background: C.panel, backdropFilter: "blur(6px)",
        border: `1px solid ${C.line}`, borderRadius: 28,
        padding: "56px 48px",
        boxShadow: "0 20px 60px rgba(37,99,235,0.08)",
      }}>

        {/* ── 헤더 (중앙 정렬) ── */}
        <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto" }}>
          <p style={{ color: C.accent, letterSpacing: 3, fontSize: 13, margin: 0, fontWeight: 600 }}>
            01 · INTRODUCTION
          </p>

          <h1 style={{
            fontSize: 40, lineHeight: 1.3, fontWeight: 800,
            margin: "18px 0 0", letterSpacing: -0.5,
          }}>
            이차전지·반도체 물성 분석 및 개발<br />
            <span style={{
              background: `linear-gradient(90deg, ${C.accent}, ${C.accentDeep})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Orchestrator</span>
          </h1>

          <div style={{
            width: 56, height: 4, background: C.accent,
            borderRadius: 2, margin: "24px auto",
          }} />

          <p style={{ fontSize: 16.5, lineHeight: 1.95, color: C.sub, margin: 0 }}>
            측정 데이터를 넣으면 여러 분석 에이전트가 물성값을 뽑고, 이상을 찾아,
            문헌 근거와 함께 리포트하는 <strong style={{ color: C.ink }}>연구 보조 지휘 시스템</strong>입니다.
            물성값 계산은 코드가, 해석과 문헌 대조는 AI가 담당해
            <strong style={{ color: C.ink }}> hallucination을 구조적으로 차단</strong>하는 것을 핵심 원칙으로 삼습니다.
          </p>
        </div>

        {/* ── 예시 프롬프트 (중앙, 폭 제한) ── */}
        <div style={{
          margin: "36px auto 0", maxWidth: 620,
          background: C.card, border: `1px solid ${C.line}`,
          borderRadius: 16, padding: "24px 28px", textAlign: "center",
          boxShadow: "0 6px 20px rgba(37,99,235,0.06)",
        }}>
          <p style={{ color: C.accent, fontSize: 12, letterSpacing: 2, margin: "0 0 12px", fontWeight: 600 }}>
            EXAMPLE PROMPT
          </p>
          <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.8, color: C.ink }}>
            (Ex) Domain : 이차전지 ; 태양전지<br />
            <span style={{ color: C.sub }}>
              "이 J-V 곡선에서 FF가 왜 낮은지 원인 후보를 찾아줘"
            </span>
          </p>
        </div>

        {/* ── HOW IT WORKS ── */}
        <p style={{ color: C.accent, letterSpacing: 3, fontSize: 13, margin: "64px 0 0", textAlign: "center", fontWeight: 600 }}>
          02 · HOW IT WORKS
        </p>
        <h2 style={{ fontSize: 24, margin: "10px 0 28px", textAlign: "center", letterSpacing: -0.3 }}>
          추출 → 진단 → 대조
        </h2>

        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          {steps.map((s) => (
            <div key={s.no} style={{
              flex: 1, minWidth: 250, background: C.card,
              border: `1px solid ${C.line}`, borderRadius: 18, padding: 24,
              boxShadow: "0 6px 20px rgba(37,99,235,0.05)",
            }}>
              <p style={{ color: C.accent, fontSize: 11.5, letterSpacing: 1.5, margin: 0, fontWeight: 600 }}>
                {s.no}
              </p>
              <h3 style={{ fontSize: 18, margin: "10px 0 6px" }}>{s.title}</h3>
              <p style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.6, margin: "0 0 14px" }}>
                {s.desc}
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {s.items.map((it) => (
                  <li key={it} style={{
                    fontSize: 13, color: C.ink, lineHeight: 1.6,
                    padding: "7px 0 7px 18px", position: "relative",
                    borderTop: `1px solid ${C.accentSoft}`,
                  }}>
                    <span style={{ position: "absolute", left: 0, top: 7, color: C.accent }}>›</span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── WHY IT MATTERS ── */}
        <p style={{ color: C.accent, letterSpacing: 3, fontSize: 13, margin: "64px 0 0", textAlign: "center", fontWeight: 600 }}>
          03 · WHY IT MATTERS
        </p>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 24 }}>
          {[
            ["분석 시간 단축", "여러 시스템을 뒤지던 시간을, 데이터·문헌·과거 사례를 한 번에 모아 줄입니다."],
            ["재현 가능성", "누가·어떤 데이터로·어떤 근거로 판단했는지 이력이 남아 검증할 수 있습니다."],
            ["신입도 전문가처럼", "숙련 엔지니어의 판단 절차가 축적되어, 초심자도 원인 후보와 확인 절차를 따라갑니다."],
          ].map(([t, d]) => (
            <div key={t} style={{ flex: 1, minWidth: 240, textAlign: "center" }}>
              <h4 style={{ fontSize: 15.5, margin: "0 0 8px", color: C.accent }}>{t}</h4>
              <p style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.7, margin: 0 }}>{d}</p>
            </div>
          ))}
        </div>

        {/* ── TECH STACK ── */}
        <p style={{ color: C.accent, letterSpacing: 3, fontSize: 13, margin: "64px 0 16px", textAlign: "center", fontWeight: 600 }}>
          TECH STACK
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          {tags.map((t) => (
            <span key={t} style={{
              fontSize: 12.5, color: C.accentDeep, background: C.accentSoft,
              border: `1px solid ${C.line}`, borderRadius: 999, padding: "6px 15px",
            }}>{t}</span>
          ))}
        </div>

        {/* ── 인용 ── */}
        <div style={{
          marginTop: 56, paddingTop: 28, borderTop: `1px solid ${C.line}`,
          color: C.sub, fontSize: 13.5, lineHeight: 1.8, textAlign: "center",
        }}>
          "전문가를 대체하는 AI가 아니라, 전문가가 더 빠르고 정확하게 판단하도록 돕는
          연구용 지휘 시스템."<br />
          <span style={{ color: C.accent, fontWeight: 600 }}>— N077 박병관</span>
        </div>

      </div>
    </div>
  );
}