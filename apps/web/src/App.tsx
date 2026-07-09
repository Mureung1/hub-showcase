import React, { useState, useEffect } from "react";

/**
 * WeatherPilot v3 — POS 진단 + 검토·편집 + 법적 안전장치 + 쿠폰 추적 (React + TypeScript)
 * - 실제 날씨/POS/발송 API 미연동 (mock 데이터)
 * - 외부 스타일링 라이브러리 없음: 인라인 스타일 객체 + 스코프 <style> 만 사용
 *
 * 흐름: 대시보드(POS 진단) → 검토·편집(문구+채널+법적필터) → 발송 → 쿠폰 추적 / 성과 탭
 */

// ---- 타입 -------------------------------------------------------------------
type ScenarioKey = "sunny" | "rain" | "cold" | "heat";
type ChannelId = "instagram" | "x" | "dangol";
type Tone = "good" | "warn";
type Tab = "home" | "perf";
type View = "dashboard" | "edit" | "sent";

interface Coupon { used: number; revenue: number; }
interface Scenario {
  label: string; emoji: string; temp: string; cond: string;
  posDiag: string; bars: number[]; barToday: number; todayDown: boolean;
  normalSales: number; predSales: number; target: number;
  impTone: Tone; impHead: string; impDetail: string;
  title: string; copy: string; promo: string;
  channels: ChannelId[]; coupon: Coupon;
}
interface ChannelMeta { id: ChannelId; icon: string; label: string; desc: string; legal: boolean; }
interface HistoryItem { emoji: string; title: string; date: string; used: number; total: number; revenue: number; }

// ---- Mock 데이터 -------------------------------------------------------------
const SCENARIOS: Record<ScenarioKey, Scenario> = {
  rain: {
    label: "비", emoji: "🌧️", temp: "18°C", cond: "비 · 습도 85% · 강수 6mm/h",
    posDiag: "이 가게는 비 오는 날 평균 -18%",
    bars: [62, 70, 58, 66, 72, 45, 60], barToday: 5, todayDown: true,
    normalSales: 840000, predSales: 689000, target: 780000,
    impTone: "warn", impHead: "이 가게 데이터 기준 -18% 예상",
    impDetail: "최근 비 온 6일 평균 매출이 맑은 날 대비 18% 낮았어요. 픽업 프로모션 발송 시 평균 -7%까지 방어됐습니다.",
    title: "비 오는 날 픽업 할인 캠페인",
    copy: "비 오는 오늘, 굳이 나오지 마세요!\n따뜻한 아메리카노가 생각날 땐\n미리 주문하고 픽업하세요.\n오늘 픽업 주문 10% 할인",
    promo: "픽업 주문 10% 할인 (오늘 하루)",
    channels: ["instagram", "dangol"], coupon: { used: 37, revenue: 48100 },
  },
  sunny: {
    label: "맑음", emoji: "☀️", temp: "24°C", cond: "맑음 · 습도 40% · 바람 약함",
    posDiag: "이 가게는 맑은 날 평균 +12%",
    bars: [62, 70, 58, 66, 72, 80, 60], barToday: 5, todayDown: false,
    normalSales: 840000, predSales: 940000, target: 940000,
    impTone: "good", impHead: "이 가게 데이터 기준 +12% 기대",
    impDetail: "맑은 날은 테이크아웃 비중이 평균 22% 올라가요. 야외석·산책 수요를 겨냥한 게시물이 유입에 효과적이었습니다.",
    title: "맑은 날 테이크아웃 픽업 캠페인",
    copy: "날씨 좋은 오늘, 산책 한 잔 어때요?\n시원한 콜드브루 들고 가볍게 걸어보세요.\n오늘 테이크아웃 전 음료 15% 할인",
    promo: "테이크아웃 음료 15% 할인 (오늘)",
    channels: ["instagram", "x"], coupon: { used: 29, revenue: 39200 },
  },
  cold: {
    label: "한파", emoji: "❄️", temp: "-6°C", cond: "한파 · 체감 -12°C · 바람 강함",
    posDiag: "이 가게는 한파에 방문 -28%, 객단가 +9%",
    bars: [62, 70, 58, 66, 72, 40, 55], barToday: 5, todayDown: true,
    normalSales: 840000, predSales: 605000, target: 720000,
    impTone: "warn", impHead: "방문 -28% · 객단가는 +9%",
    impDetail: "추운 날은 손님 수가 크게 줄지만 온 손님의 객단가는 오릅니다. 단골 대상 세트 쿠폰이 방문 회복에 가장 효과적이었어요.",
    title: "한파 대비 단골 온기 쿠폰",
    copy: "오늘 진짜 춥죠? 몸 녹이러 오세요.\n따뜻한 라떼 + 오늘의 스콘 세트를\n단골님께만 드려요.\n이 문자 보여주시면 세트 2,000원 할인",
    promo: "따뜻한 세트 2,000원 할인 (단골 전용)",
    channels: ["dangol"], coupon: { used: 44, revenue: 61500 },
  },
  heat: {
    label: "폭염", emoji: "🥵", temp: "35°C", cond: "폭염 · 체감 38°C · 자외선 매우 높음",
    posDiag: "이 가게는 폭염 낮 -20%, 저녁 +15%",
    bars: [62, 70, 58, 66, 72, 48, 75], barToday: 6, todayDown: false,
    normalSales: 840000, predSales: 790000, target: 880000,
    impTone: "warn", impHead: "낮 -20% · 저녁 +15% 편중",
    impDetail: "폭염엔 낮 방문이 줄고 저녁에 몰립니다. 17시 이후 에이드 프로모션이 저녁 피크를 앞당기는 데 효과가 컸어요.",
    title: "폭염 쿨다운 저녁 캠페인",
    copy: "이 더위, 얼음 동동 한 잔이 답입니다.\n오후 5시부터 시그니처 에이드\n시원하게 준비했어요.\n저녁 방문 시 에이드 20% 할인",
    promo: "17시 이후 에이드 20% 할인 (오늘)",
    channels: ["instagram", "x", "dangol"], coupon: { used: 33, revenue: 44800 },
  },
};

const CHANNELS: ChannelMeta[] = [
  { id: "instagram", icon: "📷", label: "인스타그램", desc: "피드 자동 게시", legal: false },
  { id: "x", icon: "𝕏", label: "X (트위터)", desc: "게시물 자동 업로드", legal: false },
  { id: "dangol", icon: "💬", label: "단골 메시지", desc: "쿠폰 포함 · 광고성 정보", legal: true },
];

const HISTORY: HistoryItem[] = [
  { emoji: "🌧️", title: "비 오는 날 픽업 할인", date: "어제", used: 37, total: 142, revenue: 48100 },
  { emoji: "❄️", title: "한파 단골 온기 쿠폰", date: "3일 전", used: 44, total: 142, revenue: 61500 },
  { emoji: "☀️", title: "맑은 날 테이크아웃", date: "5일 전", used: 29, total: 142, revenue: 39200 },
  { emoji: "🌧️", title: "장마 배달 프로모션", date: "1주 전", used: 41, total: 142, revenue: 53400 },
];

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const DANGOL_TOTAL = 142;
const DANGOL_CONSENT = 98;

// ---- 스타일 토큰 -------------------------------------------------------------
const C = {
  bg: "#F4F6FB", card: "#FFFFFF", ink: "#15202E", sub: "#5B6675", muted: "#8A94A6",
  line: "#E6EAF1", brand: "#2F55D4", brandBg: "#EEF2FE",
  go: "#12996B", goBg: "#E8F7F0", warn: "#E1683B", warnBg: "#FCEDE6", warnLine: "#F3CDBB",
};
const font = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic',system-ui,-apple-system,sans-serif";
const won = (n: number): string => n.toLocaleString() + "원";

// ---- 최상위 컴포넌트 ---------------------------------------------------------
export default function WeatherPilotV3() {
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>("rain");
  const [tab, setTab] = useState<Tab>("home");
  const [view, setView] = useState<View>("dashboard");

  // 편집 상태 (검토 화면)
  const [copy, setCopy] = useState("");
  const [channels, setChannels] = useState<ChannelId[]>([]);
  const [nightMode, setNightMode] = useState(false);

  const s = SCENARIOS[scenarioKey];

  function pickScenario(k: ScenarioKey) {
    setScenarioKey(k);
    setView("dashboard");
    setNightMode(false);
  }
  function switchTab(t: Tab) {
    setTab(t);
    setView("dashboard");
  }
  function goEdit() {
    setCopy(s.copy);
    setChannels([...s.channels]);
    setNightMode(false);
    setView("edit");
  }
  function toggleChannel(id: ChannelId) {
    setChannels((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  const showDemoBar = tab === "home" && view === "dashboard";

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: font, color: C.ink }}>
      <style>{`
        .wp-btn{transition:transform .12s ease, opacity .15s ease, background .15s ease;}
        .wp-btn:active{transform:translateY(1px) scale(.995);}
        .wp-primary:hover:not(:disabled){opacity:.88;}
        .wp-chip:hover:not(.on){background:#EEF1F7;}
        .wp-ch:hover:not(.on){background:#F7F9FE;}
        textarea:focus,button:focus-visible{outline:3px solid rgba(47,85,212,.35);outline-offset:2px;}
        @keyframes wpFade{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:none;}}
        @keyframes wpPulse{0%,100%{opacity:1;}50%{opacity:.3;}}
        .wp-view{animation:wpFade .22s ease;}
        @media (prefers-reduced-motion: reduce){.wp-view{animation:none;} .wp-btn{transition:none;} .wp-dot{animation:none;}}
      `}</style>

      <div style={{ maxWidth: 440, margin: "0 auto", padding: "16px 16px 40px" }}>
        {/* 브랜드 바 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 2px 14px" }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: C.brand, display: "grid", placeItems: "center", color: "#fff", fontSize: 16, fontWeight: 800 }}>⛅</div>
          <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: -0.3 }}>WeatherPilot</div>
          <div style={{ marginLeft: "auto", fontSize: 12, color: C.muted }}>김사장 카페 · 서면점</div>
        </div>

        {/* 탭 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, background: "#EDF0F6", padding: 4, borderRadius: 10 }}>
          {(["home", "perf"] as Tab[]).map((t) => {
            const on = tab === t;
            return (
              <button key={t} className="wp-btn" onClick={() => switchTab(t)}
                style={{ flex: 1, cursor: "pointer", padding: 8, borderRadius: 8, border: "none", background: on ? "#fff" : "transparent", color: on ? C.ink : C.sub, fontWeight: 700, fontSize: 13, fontFamily: font, boxShadow: on ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
                {t === "home" ? "오늘" : "성과"}
              </button>
            );
          })}
        </div>

        {/* 데모 컨트롤 */}
        {showDemoBar && (
          <div style={{ border: `1px dashed ${C.line}`, borderRadius: 12, padding: "10px 12px", marginBottom: 14, background: "#FBFCFE" }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>🧪 데모 컨트롤 · 날씨를 바꾸면 제안이 달라집니다</div>
            <div style={{ display: "flex", gap: 6 }}>
              {(Object.entries(SCENARIOS) as [ScenarioKey, Scenario][]).map(([k, v]) => {
                const on = k === scenarioKey;
                return (
                  <button key={k} className={`wp-chip wp-btn${on ? " on" : ""}`} onClick={() => pickScenario(k)}
                    style={{ flex: 1, cursor: "pointer", padding: "8px 4px", borderRadius: 10, border: `1px solid ${on ? C.brand : C.line}`, background: on ? C.brand : "#fff", color: on ? "#fff" : C.ink, fontWeight: 700, fontSize: 12, fontFamily: font, lineHeight: 1 }}>
                    {v.emoji} {v.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === "perf" ? (
          <PerfView />
        ) : view === "dashboard" ? (
          <Dashboard s={s} onReview={goEdit} />
        ) : view === "edit" ? (
          <EditView
            s={s} copy={copy} setCopy={setCopy}
            channels={channels} toggleChannel={toggleChannel}
            nightMode={nightMode} setNightMode={setNightMode}
            onBack={() => setView("dashboard")} onSend={() => setView("sent")}
          />
        ) : (
          <SentView s={s} channels={channels} nightMode={nightMode} onBack={() => setView("dashboard")} />
        )}
      </div>
    </div>
  );
}

// ---- 대시보드 (POS 진단 + 추천) ---------------------------------------------
function Dashboard({ s, onReview }: { s: Scenario; onReview: () => void }) {
  const maxBar = Math.max(...s.bars);
  const defended = Math.max(s.target - s.predSales, 0);
  return (
    <div className="wp-view">
      <Card first>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>오늘의 날씨 · 부산 서면</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginTop: 6 }}>
          <div style={{ fontSize: 46, lineHeight: 1 }}>{s.emoji}</div>
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1 }}>{s.temp}</div>
        </div>
        <div style={{ fontSize: 13, color: C.sub, marginTop: 5 }}>{s.cond}</div>
        <div style={{ marginTop: 12, fontSize: 11, display: "inline-flex", gap: 4, alignItems: "center", background: "#F4F7FC", padding: "4px 10px", borderRadius: 999, fontWeight: 600, color: C.muted }}>
          ✓ 기상청·OpenWeather·AccuWeather 3개 소스 평균
        </div>
      </Card>

      <Card>
        <Eyebrow>📊 POS 연동 · 이 가게 매출 진단</Eyebrow>
        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>{s.posDiag}</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 56, marginTop: 14 }}>
          {s.bars.map((h, i) => {
            const isToday = i === s.barToday;
            const col = isToday ? (s.todayDown ? C.warn : C.go) : "#CBD4E1";
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <div style={{ height: `${(h / maxBar) * 100}%`, minHeight: 6, borderRadius: "3px 3px 0 0", background: col }} />
                <div style={{ fontSize: 9, color: C.muted, textAlign: "center", marginTop: 4 }}>{DAYS[i]}</div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 10.5, color: C.muted, textAlign: "right", marginTop: 2 }}>최근 7일 매출 · 오늘 예측 포함</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
          <Metric label="오늘 예측 매출" value={won(s.predSales)} sub={`평상시 ${won(s.normalSales)}`} subColor={s.todayDown ? C.warn : C.go} />
          <Metric label="캠페인 방어 목표" value={won(s.target)} sub={`+${won(defended)} 방어`} subColor={C.brand} />
        </div>
      </Card>

      <Card>
        <Eyebrow>🤖 에이전트 추천 · 오늘의 액션</Eyebrow>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, padding: "6px 10px", borderRadius: 999, fontSize: 13, fontWeight: 700, background: s.impTone === "good" ? C.goBg : C.warnBg, color: s.impTone === "good" ? C.go : C.warn }}>
          {s.impTone === "good" ? "▲" : "▼"} {s.impHead}
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 13.5, lineHeight: 1.6, color: C.sub }}>{s.impDetail}</p>
        <div style={{ fontSize: 16, fontWeight: 800, marginTop: 14, letterSpacing: -0.3 }}>{s.title}</div>
        <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 12, background: "#F7F9FE", border: `1px solid ${C.line}`, fontSize: 13.5, lineHeight: 1.65, whiteSpace: "pre-line" }}>{s.copy}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12.5, color: C.brand, fontWeight: 700 }}>🎟️ {s.promo}</div>
        <button className="wp-btn wp-primary" onClick={onReview}
          style={{ marginTop: 16, width: "100%", cursor: "pointer", border: "none", padding: 14, borderRadius: 13, background: C.brand, color: "#fff", fontWeight: 800, fontSize: 15.5, fontFamily: font, boxShadow: "0 6px 16px rgba(47,85,212,.28)" }}>
          제안 검토하기 →
        </button>
        <div style={{ textAlign: "center", fontSize: 11.5, color: C.muted, marginTop: 8 }}>초안·타깃·쿠폰까지 에이전트가 준비했어요.</div>
      </Card>
    </div>
  );
}

// ---- 검토·편집 (문구 + 채널 + 법적 안전장치) --------------------------------
function EditView({ s, copy, setCopy, channels, toggleChannel, nightMode, setNightMode, onBack, onSend }: {
  s: Scenario;
  copy: string; setCopy: (v: string) => void;
  channels: ChannelId[]; toggleChannel: (id: ChannelId) => void;
  nightMode: boolean; setNightMode: (v: boolean) => void;
  onBack: () => void; onSend: () => void;
}) {
  const dangolOn = channels.includes("dangol");
  const anyChannel = channels.length > 0;
  const sendLabel = !anyChannel ? "채널을 1개 이상 선택"
    : dangolOn && nightMode ? "예약발송 예약하기"
    : "이대로 발송하기";

  return (
    <div className="wp-view">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <button className="wp-btn" onClick={onBack} aria-label="뒤로" style={{ width: 34, height: 34, borderRadius: 10, cursor: "pointer", fontFamily: font, border: `1px solid ${C.line}`, background: "#fff", fontSize: 16 }}>←</button>
        <div style={{ fontWeight: 800, fontSize: 16 }}>제안 검토 · 수정</div>
      </div>

      {/* 문구 편집 */}
      <Card>
        <Eyebrow>✏️ 발송 문구 · 수정 가능</Eyebrow>
        <textarea
          value={copy}
          onChange={(e) => setCopy(e.target.value)}
          rows={6}
          style={{ width: "100%", marginTop: 10, boxSizing: "border-box", resize: "vertical", border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px", fontSize: 14, lineHeight: 1.6, fontFamily: font, color: C.ink, background: "#FBFCFE" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12.5, color: C.brand, fontWeight: 700 }}>🎟️ {s.promo}</div>
      </Card>

      {/* 채널 선택 + 법적 안전장치 */}
      <Card>
        <Eyebrow>📨 발송 채널</Eyebrow>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {CHANNELS.map((ch) => {
            const on = channels.includes(ch.id);
            return (
              <button key={ch.id} className={`wp-ch wp-btn${on ? " on" : ""}`} onClick={() => toggleChannel(ch.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", cursor: "pointer", padding: "12px 14px", borderRadius: 12, fontFamily: font, width: "100%", border: `1.5px solid ${on ? C.brand : C.line}`, background: on ? C.brandBg : "#fff" }}>
                <span style={{ fontSize: 20, width: 26, textAlign: "center" }}>{ch.icon}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontWeight: 700, fontSize: 14 }}>
                    {ch.label}
                    {ch.legal && <span style={{ fontSize: 10, color: C.warn, background: C.warnBg, padding: "1px 6px", borderRadius: 5, marginLeft: 6 }}>광고성</span>}
                  </span>
                  <span style={{ display: "block", fontSize: 12, color: C.muted, marginTop: 1 }}>{ch.desc}</span>
                </span>
                <span style={{ width: 22, height: 22, borderRadius: 999, display: "grid", placeItems: "center", border: `2px solid ${on ? C.brand : C.line}`, background: on ? C.brand : "#fff", color: "#fff", fontSize: 12, fontWeight: 900 }}>
                  {on ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>

        {dangolOn && <LegalPanel copy={copy} nightMode={nightMode} setNightMode={setNightMode} />}
      </Card>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button className="wp-btn" onClick={onBack}
          style={{ flex: "0 0 34%", cursor: "pointer", padding: 14, borderRadius: 13, border: `1.5px solid ${C.line}`, background: "#fff", color: C.sub, fontWeight: 700, fontSize: 15, fontFamily: font }}>
          돌아가기
        </button>
        <button className="wp-btn wp-primary" onClick={onSend} disabled={!anyChannel}
          style={{ flex: 1, cursor: anyChannel ? "pointer" : "not-allowed", padding: 14, borderRadius: 13, border: "none", background: anyChannel ? C.go : "#B9C2D6", color: "#fff", fontWeight: 800, fontSize: 15.5, fontFamily: font, boxShadow: anyChannel ? "0 6px 16px rgba(18,153,107,.28)" : "none" }}>
          {sendLabel}
        </button>
      </div>
    </div>
  );
}

// ---- 법적 안전장치 패널 (정보통신망법) --------------------------------------
function LegalPanel({ copy, nightMode, setNightMode }: { copy: string; nightMode: boolean; setNightMode: (v: boolean) => void }) {
  return (
    <div style={{ marginTop: 12 }}>
      {/* 수신동의 필터 */}
      <div style={{ padding: "11px 12px", borderRadius: 10, background: "#F7F9FE", fontSize: 12.5, color: C.sub, lineHeight: 1.5, display: "flex", gap: 7, alignItems: "flex-start" }}>
        <span style={{ fontSize: 15, marginTop: 1 }}>👥</span>
        <span>단골 {DANGOL_TOTAL}명 중 <b style={{ color: C.ink }}>수신동의 완료 {DANGOL_CONSENT}명</b>에게만 발송돼요. 미동의 {DANGOL_TOTAL - DANGOL_CONSENT}명은 자동 제외.</span>
      </div>

      {/* 준수 항목 */}
      <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: C.warnBg, border: `1px solid ${C.warnLine}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.warn, display: "flex", alignItems: "center", gap: 5 }}>🛡️ 정보통신망법 자동 준수</div>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12, color: C.warn, display: "flex", gap: 6, alignItems: "flex-start", lineHeight: 1.45 }}>
            <span>✓</span><span>문구 앞에 <b>(광고)</b>, 끝에 <b>무료수신거부 080번호</b> 자동 삽입</span>
          </div>
          <div style={{ fontSize: 12, color: C.warn, display: "flex", gap: 6, alignItems: "flex-start", lineHeight: 1.45 }}>
            <span>{nightMode ? "🕐" : "✓"}</span>
            <span>{nightMode
              ? <><b>야간(21시~익일 8시)</b> — 광고 문자 발송 금지. 내일 오전 8시 예약발송으로 전환됩니다.</>
              : "발송 가능 시간대입니다 (8시~21시)."}</span>
          </div>
        </div>
      </div>

      {/* 실제 발송 미리보기 (별도 컴포넌트라 커서 튐 없음) */}
      <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 10, background: "#F4F6FB", border: `1px dashed ${C.line}`, fontSize: 12.5, lineHeight: 1.6, color: C.sub, whiteSpace: "pre-line" }}>
        <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>단골 문자 실제 발송 미리보기</div>
        {`(광고) [김사장 카페]\n${copy}\n무료수신거부 080-123-4567`}
      </div>

      {/* 데모용 야간 토글 */}
      <label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10, fontSize: 12, color: C.muted, cursor: "pointer" }}>
        <input type="checkbox" checked={nightMode} onChange={(e) => setNightMode(e.target.checked)} />
        🌙 데모: 지금이 야간이라고 가정
      </label>
    </div>
  );
}

// ---- 발송 완료 + 쿠폰 추적 ---------------------------------------------------
function SentView({ s, channels, nightMode, onBack }: { s: Scenario; channels: ChannelId[]; nightMode: boolean; onBack: () => void }) {
  const cp = s.coupon;
  const dangolOn = channels.includes("dangol");
  const scheduled = dangolOn && nightMode;
  const tracking = dangolOn && !scheduled;
  const names = channels.map((id) => CHANNELS.find((c) => c.id === id)?.label).filter(Boolean) as string[];
  const target = DANGOL_CONSENT;

  const [used, setUsed] = useState(0);
  useEffect(() => {
    if (!tracking) return;
    setUsed(0);
    const timer = setInterval(() => {
      setUsed((u) => {
        if (u >= cp.used) { clearInterval(timer); return u; }
        return u + 1;
      });
    }, 90);
    return () => clearInterval(timer);
  }, [tracking, cp.used]);

  const pct = Math.min(Math.round((used / target) * 100), 100);
  const rev = cp.used > 0 ? Math.round((used / cp.used) * cp.revenue) : 0;
  const done = used >= cp.used;

  return (
    <div className="wp-view">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <button className="wp-btn" onClick={onBack} aria-label="뒤로" style={{ width: 34, height: 34, borderRadius: 10, cursor: "pointer", fontFamily: font, border: `1px solid ${C.line}`, background: "#fff", fontSize: 16 }}>←</button>
        <div style={{ fontWeight: 800, fontSize: 16 }}>캠페인 진행 현황</div>
      </div>

      <Card style={{ textAlign: "center" }}>
        <div style={{ width: 56, height: 56, margin: "0 auto 12px", borderRadius: 999, background: C.goBg, color: C.go, display: "grid", placeItems: "center", fontSize: 26 }}>{scheduled ? "🕐" : "✓"}</div>
        <div style={{ fontSize: 17, fontWeight: 800 }}>{scheduled ? "예약 완료" : "발송 완료 · 추적 시작"}</div>
        <div style={{ fontSize: 13, color: C.sub, marginTop: 5, lineHeight: 1.6 }}>
          {s.title}<br />
          {scheduled
            ? <>{names.join(" · ")}<br />단골은 <b>내일 오전 8시 예약발송</b>으로 전환됐어요.</>
            : dangolOn
              ? <>{names.join(" · ")}<br />수신동의 단골 {target}명에게 발송했어요.</>
              : <>{names.join(" · ")}에 게시됐어요.</>}
        </div>
      </Card>

      {tracking && (
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>🎟️ 쿠폰 사용 추적</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: C.go, fontWeight: 700 }}>
              <span className="wp-dot" style={{ width: 7, height: 7, borderRadius: 999, background: C.go, animation: "wpPulse 1.6s infinite" }} /> 실시간
            </span>
          </div>
          <div style={{ height: 8, background: "#EDF0F6", borderRadius: 999, marginTop: 12, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: C.go, borderRadius: 999, transition: "width .3s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: C.sub }}>
            <span>{used}명 사용 ({pct}%)</span>
            <span>{target}명 발송</span>
          </div>
          <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: C.goBg, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: C.go, fontWeight: 700 }}>이 캠페인 귀속 매출</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: C.go, marginTop: 4 }}>{won(rev)}</div>
            <div style={{ fontSize: 11, color: C.go, marginTop: 2, opacity: 0.85 }}>
              {done ? `쿠폰 사용률 ${Math.round((cp.used / target) * 100)}% · 실매출 확정` : "쿠폰 코드로 직접 추적된 실매출"}
            </div>
          </div>
        </Card>
      )}

      <p style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 14, lineHeight: 1.6 }}>
        {scheduled ? "예약 시간이 되면 자동 발송하고 추적을 시작할게요."
          : tracking ? "쿠폰 사용은 POS에서 자동 집계돼요. 날씨 회복이 아니라 이 캠페인이 만든 매출입니다."
          : "SNS 게시물 반응은 성과 탭에서 집계됩니다."}
      </p>
    </div>
  );
}

// ---- 성과 탭 ----------------------------------------------------------------
function PerfView() {
  const totalRev = HISTORY.reduce((n, h) => n + h.revenue, 0);
  const avgRate = Math.round((HISTORY.reduce((n, h) => n + h.used / h.total, 0) / HISTORY.length) * 100);
  return (
    <div className="wp-view">
      <Card first>
        <Eyebrow>📈 최근 4개 캠페인 누적 성과</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
          <Sum value="4건" label="발송 캠페인" />
          <Sum value={`${avgRate}%`} label="평균 쿠폰 사용률" />
          <Sum value={`+${(totalRev / 10000).toFixed(1)}만`} label="귀속 매출" valueColor={C.go} />
        </div>
      </Card>
      <Card>
        <Eyebrow>🕘 캠페인 이력</Eyebrow>
        <div style={{ marginTop: 6 }}>
          {HISTORY.map((h, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < HISTORY.length - 1 ? `1px solid ${C.line}` : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, display: "grid", placeItems: "center", fontSize: 18, background: C.brandBg, flexShrink: 0 }}>{h.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{h.title}</div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{h.date} · 쿠폰 {h.used}/{h.total}명 사용</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.go }}>+{won(h.revenue)}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>사용률 {Math.round((h.used / h.total) * 100)}%</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <p style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 14, lineHeight: 1.6 }}>
        매출 방어 효과가 쌓일수록 에이전트 제안을 더 신뢰할 수 있어요.
      </p>
    </div>
  );
}

// ---- 재사용 UI --------------------------------------------------------------
function Card({ children, first, style }: { children: React.ReactNode; first?: boolean; style?: React.CSSProperties }) {
  return (
    <div style={{ marginTop: first ? 0 : 12, background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, boxShadow: "0 6px 16px rgba(20,32,46,.05)", ...style }}>
      {children}
    </div>
  );
}
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: C.brand, textTransform: "uppercase" }}>{children}</div>;
}
function Metric({ label, value, sub, subColor }: { label: string; value: string; sub: string; subColor: string }) {
  return (
    <div style={{ background: "#F7F9FE", borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 11, color: C.muted }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 3 }}>{value}</div>
      <div style={{ fontSize: 11, marginTop: 2, color: subColor }}>{sub}</div>
    </div>
  );
}
function Sum({ value, label, valueColor }: { value: string; label: string; valueColor?: string }) {
  return (
    <div style={{ background: "#F7F9FE", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
      <div style={{ fontSize: 19, fontWeight: 800, color: valueColor ?? C.ink }}>{value}</div>
      <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
}
