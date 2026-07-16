import React, { useState, useEffect } from "react";
import type { ScenarioKey, ChannelId, Tone, Scenario } from "shared";
import { T, font, won, DAYS, DANGOL_TOTAL, DANGOL_CONSENT } from "./styles/tokens";
import { SCENARIOS, CHANNELS, HISTORY } from "./mocks/scenarios";
import { MOCK_MODE, getWeatherToday, getProposalToday } from "./api/client";
import { scenarioFromApi } from "./api/todayScenario";

/**
 * WeatherPilot v3 — 대시보드(날씨·매출 진단) → 검토·편집(문구+채널+법적필터) → 발송 → 쿠폰 추적 / 성과
 * - 날씨·제안은 MOCK_MODE=off일 때 서버(/weather/today·/proposal/today)에서 실연동,
 *   기본(MOCK_MODE=on)은 mocks/scenarios 데이터로 동작 (데모 보험).
 * - 스타일: 외부 라이브러리 없이 인라인 스타일 + 스코프 <style> 만 사용
 * - 톤·색·간격은 weatherpilot-design 스킬 토큰(Wurly 블루)을 그대로 따른다.
 * - 토큰=styles/tokens · mock=mocks/scenarios · API=api/client 로 분리.
 */

// ---- 타입 (화면 전용, FE·BE 공용 타입은 packages/shared) --------------------
type Tab = "home" | "perf";
type View = "dashboard" | "edit" | "sent";

// 실연동(MOCK_MODE=off) 시 오늘 날씨·제안 로딩 상태
type RemoteState =
  | { status: "mock" } // MOCK_MODE=on — 서버를 부르지 않음
  | { status: "loading" }
  | { status: "ready"; scenario: Scenario }
  | { status: "empty"; message: string } // 서버는 붙었으나 오늘 제안이 아직 없음
  | { status: "error"; message: string };

// ---- 최상위 컴포넌트 ---------------------------------------------------------
export default function WeatherPilotV3() {
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>("rain");
  const [tab, setTab] = useState<Tab>("home");
  const [view, setView] = useState<View>("dashboard");

  // 편집 상태 (검토 화면)
  const [copy, setCopy] = useState("");
  const [channels, setChannels] = useState<ChannelId[]>([]);
  const [nightMode, setNightMode] = useState(false);

  // 실연동 상태 (MOCK_MODE=off일 때만 서버에서 오늘 날씨·제안을 불러온다)
  const [remote, setRemote] = useState<RemoteState>(
    MOCK_MODE ? { status: "mock" } : { status: "loading" },
  );

  useEffect(() => {
    if (MOCK_MODE) return;
    let cancelled = false;
    (async () => {
      try {
        const [w, p] = await Promise.all([getWeatherToday(), getProposalToday()]);
        if (cancelled) return;
        if (p.proposal === null) {
          setRemote({ status: "empty", message: p.message });
        } else {
          setRemote({ status: "ready", scenario: scenarioFromApi(w.weather, p.proposal) });
        }
      } catch (e) {
        if (!cancelled) {
          setRemote({ status: "error", message: e instanceof Error ? e.message : "불러오기 실패" });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 화면이 쓰는 시나리오: mock 모드는 데모 선택값, 실연동은 서버 결과(안전망으로 mock).
  const remoteScenario = remote.status === "ready" ? remote.scenario : null;
  const s: Scenario = MOCK_MODE ? SCENARIOS[scenarioKey] : (remoteScenario ?? SCENARIOS[scenarioKey]);

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

  const showDemoBar = MOCK_MODE && tab === "home" && view === "dashboard";

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: font, color: T.ink }}>
      <style>{`
        .wp-btn{transition:transform .12s ease, opacity .15s ease, background .15s ease;}
        .wp-btn:active{transform:translateY(1px) scale(.995);}
        .wp-primary:hover:not(:disabled){opacity:.9;}
        .wp-chip:hover:not(.on){background:#E7EEF6;}
        .wp-ch:hover:not(.on){background:#F0F5FB;}
        textarea:focus,button:focus-visible{outline:3px solid rgba(74,144,226,.35);outline-offset:2px;}
        @keyframes wpFade{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:none;}}
        @keyframes wpPulse{0%,100%{opacity:1;}50%{opacity:.3;}}
        .wp-view{animation:wpFade .22s ease;}
        @media (prefers-reduced-motion: reduce){.wp-view{animation:none;} .wp-btn{transition:none;} .wp-dot{animation:none;}}
      `}</style>

      <div style={{ maxWidth: 440, margin: "0 auto", padding: "16px 16px 40px" }}>
        {/* 브랜드 바 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 2px 14px" }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: T.gradient, display: "grid", placeItems: "center", color: "#fff", fontSize: 16 }}>⛅</div>
          <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: -0.3 }}>WeatherPilot</div>
          <div style={{ marginLeft: "auto", fontSize: 12, color: T.sub }}>김사장 카페 · 서면점</div>
        </div>

        {/* 세그먼트 토글 (오늘 / 성과) */}
        <div style={{ display: "flex", gap: 4, marginBottom: 14, background: T.surfaceAlt, padding: 4, borderRadius: 999 }}>
          {(["home", "perf"] as Tab[]).map((t) => {
            const on = tab === t;
            return (
              <button key={t} className="wp-btn" onClick={() => switchTab(t)}
                style={{ flex: 1, cursor: "pointer", padding: "9px 8px", borderRadius: 999, border: "none", background: on ? T.primary : "transparent", color: on ? "#fff" : T.ink, fontWeight: on ? 700 : 600, fontSize: 14, fontFamily: font, boxShadow: on ? T.shadowBlue : "none" }}>
                {t === "home" ? "오늘" : "성과"}
              </button>
            );
          })}
        </div>

        {/* 데모 컨트롤 */}
        {showDemoBar && (
          <div style={{ border: `1px dashed ${T.border}`, borderRadius: 12, padding: "10px 12px", marginBottom: 14, background: "#FBFDFF" }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>🧪 데모 컨트롤 · 날씨를 바꾸면 제안이 달라집니다</div>
            <div style={{ display: "flex", gap: 6 }}>
              {(Object.entries(SCENARIOS) as [ScenarioKey, Scenario][]).map(([k, v]) => {
                const on = k === scenarioKey;
                return (
                  <button key={k} className={`wp-chip wp-btn${on ? " on" : ""}`} onClick={() => pickScenario(k)}
                    style={{ flex: 1, cursor: "pointer", padding: "8px 4px", borderRadius: 999, border: `1px solid ${on ? T.primary : T.border}`, background: on ? T.primary : "#fff", color: on ? "#fff" : T.ink, fontWeight: 600, fontSize: 12, fontFamily: font, lineHeight: 1 }}>
                    {v.emoji} {v.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === "perf" ? (
          <PerfView />
        ) : !MOCK_MODE && remote.status !== "ready" ? (
          <RemoteStatus state={remote} />
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

// ---- 대시보드 (히어로 진단 + POS + 추천) ------------------------------------
function Dashboard({ s, onReview }: { s: Scenario; onReview: () => void }) {
  const maxBar = Math.max(...s.bars);
  const defended = Math.max(s.target - s.predSales, 0);
  return (
    <div className="wp-view">
      {/* 피처 카드(블루) — 날씨 + 매출 진단 히어로 */}
      <div style={{ background: T.gradient, borderRadius: 20, padding: 20, color: T.onBlue, boxShadow: T.shadowBlue }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>오늘의 날씨 · 부산 서면</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: 12 }}>
          <div style={{ fontSize: 64, lineHeight: 1, flexShrink: 0 }}>{s.emoji}</div>
          <div>
            <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.1, letterSpacing: -0.5 }}>{s.temp}</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginTop: 6, color: "#fff", opacity: 0.95 }}>{s.cond}</div>
          </div>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 14, padding: "5px 12px", borderRadius: 999, background: "rgba(255,255,255,0.28)", fontSize: 11, fontWeight: 600 }}>
          ✓ 기상청·OpenWeather·AccuWeather 3개 소스 평균
        </div>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.4)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>이 가게 매출 진단</div>
          <DiagPill tone={s.diagTone} text={s.diagText} />
        </div>
      </div>

      {/* POS 매출 스파크라인 + 예측/목표 타일 */}
      <Card>
        <Eyebrow>📊 POS 연동 · 최근 7일 매출</Eyebrow>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 56, marginTop: 14 }}>
          {s.bars.map((h, i) => {
            const isToday = i === s.barToday;
            const col = isToday ? (s.todayDown ? T.down : T.up) : "#CBD9EA";
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <div style={{ height: `${(h / maxBar) * 100}%`, minHeight: 6, borderRadius: "4px 4px 0 0", background: col }} />
                <div style={{ fontSize: 9, color: T.muted, textAlign: "center", marginTop: 4 }}>{DAYS[i]}</div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 10.5, color: T.muted, textAlign: "right", marginTop: 2 }}>오늘 예측 포함</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          <Metric label="오늘 예측 매출" value={won(s.predSales)} sub={`평상시 ${won(s.normalSales)}`} subColor={s.todayDown ? T.downText : T.upText} />
          <Metric label="캠페인 방어 목표" value={won(s.target)} sub={`+${won(defended)} 방어`} subColor={T.primaryDark} />
        </div>
      </Card>

      {/* 에이전트 추천 액션 */}
      <Card>
        <Eyebrow>🤖 에이전트 추천 · 오늘의 액션</Eyebrow>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, padding: "6px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700, background: s.impTone === "up" ? T.upBg : T.downBg, color: s.impTone === "up" ? T.upText : T.downText }}>
          {s.impTone === "up" ? "▲" : "▼"} {s.impHead}
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 13.5, lineHeight: 1.6, color: T.sub }}>{s.impDetail}</p>
        <div style={{ fontSize: 17, fontWeight: 600, marginTop: 14, letterSpacing: -0.3 }}>{s.title}</div>
        <div style={{ marginTop: 10, padding: 16, borderRadius: 12, background: T.surfaceAlt, fontSize: 13.5, lineHeight: 1.65, whiteSpace: "pre-line" }}>{s.copy}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 12.5, color: T.primaryDark, fontWeight: 600 }}>
          <span style={{ fontSize: 15 }}>🎟️</span> {s.promo}
        </div>
        <button className="wp-btn wp-primary" onClick={onReview}
          style={{ marginTop: 16, width: "100%", cursor: "pointer", border: "none", padding: 14, borderRadius: 999, background: T.primary, color: "#fff", fontWeight: 600, fontSize: 16, fontFamily: font, boxShadow: T.shadowBlue }}>
          제안 검토하기 →
        </button>
        <div style={{ textAlign: "center", fontSize: 11.5, color: T.muted, marginTop: 8 }}>초안·타깃·쿠폰까지 에이전트가 준비했어요.</div>
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
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <button className="wp-btn" onClick={onBack} aria-label="뒤로" style={{ width: 34, height: 34, borderRadius: 10, cursor: "pointer", fontFamily: font, border: `1px solid ${T.border}`, background: "#fff", fontSize: 16 }}>←</button>
        <div style={{ fontWeight: 700, fontSize: 17 }}>제안 검토 · 수정</div>
      </div>

      {/* 문구 편집 */}
      <Card>
        <Eyebrow>✏️ 발송 문구 · 수정 가능</Eyebrow>
        <textarea
          value={copy}
          onChange={(e) => setCopy(e.target.value)}
          rows={6}
          style={{ width: "100%", marginTop: 10, boxSizing: "border-box", resize: "vertical", border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", fontSize: 14, lineHeight: 1.6, fontFamily: font, color: T.ink, background: T.surfaceAlt }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12.5, color: T.primaryDark, fontWeight: 600 }}>
          <span style={{ fontSize: 15 }}>🎟️</span> {s.promo}
        </div>
      </Card>

      {/* 채널 선택 + 법적 안전장치 */}
      <Card>
        <Eyebrow>📨 발송 채널</Eyebrow>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {CHANNELS.map((ch) => {
            const on = channels.includes(ch.id);
            return (
              <button key={ch.id} className={`wp-ch wp-btn${on ? " on" : ""}`} onClick={() => toggleChannel(ch.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", cursor: "pointer", padding: "12px 14px", borderRadius: 12, fontFamily: font, width: "100%", border: `1.5px solid ${on ? T.primary : T.border}`, background: on ? "#EAF2FC" : "#fff" }}>
                <span style={{ fontSize: 20, width: 26, textAlign: "center" }}>{ch.icon}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontWeight: 600, fontSize: 14, color: T.ink }}>
                    {ch.label}
                    {ch.legal && <span style={{ fontSize: 10, color: T.downText, background: T.downBg, padding: "1px 6px", borderRadius: 5, marginLeft: 6, fontWeight: 600 }}>광고성</span>}
                  </span>
                  <span style={{ display: "block", fontSize: 12, color: T.sub, marginTop: 1 }}>{ch.desc}</span>
                </span>
                <span style={{ width: 22, height: 22, borderRadius: 999, display: "grid", placeItems: "center", border: `2px solid ${on ? T.primary : T.border}`, background: on ? T.primary : "#fff", color: "#fff", fontSize: 12, fontWeight: 900 }}>
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
          style={{ flex: "0 0 34%", cursor: "pointer", padding: 14, borderRadius: 999, border: `1.5px solid ${T.border}`, background: "#fff", color: T.sub, fontWeight: 600, fontSize: 15, fontFamily: font }}>
          돌아가기
        </button>
        <button className="wp-btn wp-primary" onClick={onSend} disabled={!anyChannel}
          style={{ flex: 1, cursor: anyChannel ? "pointer" : "not-allowed", padding: 14, borderRadius: 999, border: "none", background: anyChannel ? T.up : "#C3CDDA", color: "#fff", fontWeight: 700, fontSize: 15.5, fontFamily: font, boxShadow: anyChannel ? "0 6px 16px rgba(47,179,122,.28)" : "none" }}>
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
      <div style={{ padding: "11px 12px", borderRadius: 12, background: T.surfaceAlt, fontSize: 12.5, color: T.sub, lineHeight: 1.5, display: "flex", gap: 7, alignItems: "flex-start" }}>
        <span style={{ fontSize: 15, marginTop: 1 }}>👥</span>
        <span>단골 {DANGOL_TOTAL}명 중 <b style={{ color: T.ink }}>수신동의 완료 {DANGOL_CONSENT}명</b>에게만 발송돼요. 미동의 {DANGOL_TOTAL - DANGOL_CONSENT}명은 자동 제외.</span>
      </div>

      {/* 준수 항목 */}
      <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: T.downBg, border: `1px solid ${T.warnLine}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.downText, display: "flex", alignItems: "center", gap: 5 }}>🛡️ 정보통신망법 자동 준수</div>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12, color: T.downText, display: "flex", gap: 6, alignItems: "flex-start", lineHeight: 1.45 }}>
            <span>✓</span><span>문구 앞에 <b>(광고)</b>, 끝에 <b>무료수신거부 080번호</b> 자동 삽입</span>
          </div>
          <div style={{ fontSize: 12, color: T.downText, display: "flex", gap: 6, alignItems: "flex-start", lineHeight: 1.45 }}>
            <span>{nightMode ? "🕐" : "✓"}</span>
            <span>{nightMode
              ? <><b>야간(21시~익일 8시)</b> — 광고 문자 발송 금지. 내일 오전 8시 예약발송으로 전환됩니다.</>
              : "발송 가능 시간대입니다 (8시~21시)."}</span>
          </div>
        </div>
      </div>

      {/* 실제 발송 미리보기 */}
      <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 12, background: T.bg, border: `1px dashed ${T.border}`, fontSize: 12.5, lineHeight: 1.6, color: T.sub, whiteSpace: "pre-line" }}>
        <div style={{ fontSize: 10.5, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>단골 문자 실제 발송 미리보기</div>
        {`(광고) [김사장 카페]\n${copy}\n무료수신거부 080-123-4567`}
      </div>

      {/* 데모용 야간 토글 */}
      <label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10, fontSize: 12, color: T.muted, cursor: "pointer" }}>
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
    const reset = setTimeout(() => setUsed(0), 0);
    const timer = setInterval(() => {
      setUsed((u) => {
        if (u >= cp.used) { clearInterval(timer); return u; }
        return u + 1;
      });
    }, 90);
    return () => { clearTimeout(reset); clearInterval(timer); };
  }, [tracking, cp.used]);

  const pct = Math.min(Math.round((used / target) * 100), 100);
  const rev = cp.used > 0 ? Math.round((used / cp.used) * cp.revenue) : 0;
  const done = used >= cp.used;

  return (
    <div className="wp-view">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <button className="wp-btn" onClick={onBack} aria-label="뒤로" style={{ width: 34, height: 34, borderRadius: 10, cursor: "pointer", fontFamily: font, border: `1px solid ${T.border}`, background: "#fff", fontSize: 16 }}>←</button>
        <div style={{ fontWeight: 700, fontSize: 17 }}>캠페인 진행 현황</div>
      </div>

      <Card style={{ textAlign: "center" }}>
        <div style={{ width: 56, height: 56, margin: "0 auto 12px", borderRadius: 999, background: scheduled ? "#EAF2FC" : T.upBg, color: scheduled ? T.primary : T.up, display: "grid", placeItems: "center", fontSize: 26 }}>{scheduled ? "🕐" : "✓"}</div>
        <div style={{ fontSize: 17, fontWeight: 700 }}>{scheduled ? "예약 완료" : "발송 완료 · 추적 시작"}</div>
        <div style={{ fontSize: 13, color: T.sub, marginTop: 5, lineHeight: 1.6 }}>
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
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: T.up, fontWeight: 700 }}>
              <span className="wp-dot" style={{ width: 7, height: 7, borderRadius: 999, background: T.up, animation: "wpPulse 1.6s infinite" }} /> 실시간
            </span>
          </div>
          <div style={{ height: 8, background: "#E9EFF6", borderRadius: 999, marginTop: 12, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: T.up, borderRadius: 999, transition: "width .3s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: T.sub }}>
            <span>{used}명 사용 ({pct}%)</span>
            <span>{target}명 발송</span>
          </div>
          <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: T.upBg, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: T.upText, fontWeight: 700 }}>이 캠페인 귀속 매출</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.up, marginTop: 4 }}>{won(rev)}</div>
            <div style={{ fontSize: 11, color: T.upText, marginTop: 2 }}>
              {done ? `쿠폰 사용률 ${Math.round((cp.used / target) * 100)}% · 실매출 확정` : "쿠폰 코드로 직접 추적된 실매출"}
            </div>
          </div>
        </Card>
      )}

      <p style={{ textAlign: "center", fontSize: 12, color: T.muted, marginTop: 14, lineHeight: 1.6 }}>
        {scheduled ? "예약 시간이 되면 자동 발송하고 추적을 시작할게요."
          : tracking ? "쿠폰 사용은 쿠폰 코드로 누적 집계돼요. 날씨 회복이 아니라 이 캠페인이 만든 매출입니다."
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
      <Card>
        <Eyebrow>📈 최근 4개 캠페인 누적 성과</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
          <Sum value="4건" label="발송 캠페인" />
          <Sum value={`${avgRate}%`} label="평균 쿠폰 사용률" />
          <Sum value={`+${(totalRev / 10000).toFixed(1)}만`} label="귀속 매출" valueColor={T.up} />
        </div>
      </Card>
      <Card>
        <Eyebrow>🕘 캠페인 이력</Eyebrow>
        <div style={{ marginTop: 6 }}>
          {HISTORY.map((h, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < HISTORY.length - 1 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", fontSize: 18, background: T.surfaceAlt, flexShrink: 0 }}>{h.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{h.title}</div>
                <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>{h.date} · 쿠폰 {h.used}/{h.total}명 사용</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.upText }}>+{won(h.revenue)}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>사용률 {Math.round((h.used / h.total) * 100)}%</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <p style={{ textAlign: "center", fontSize: 12, color: T.muted, marginTop: 14, lineHeight: 1.6 }}>
        매출 방어 효과가 쌓일수록 에이전트 제안을 더 신뢰할 수 있어요.
      </p>
    </div>
  );
}

// ---- 재사용 UI --------------------------------------------------------------
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginTop: 12, background: T.surface, borderRadius: 16, padding: 20, boxShadow: T.shadowCard, ...style }}>
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.6, color: T.primary, textTransform: "uppercase" }}>{children}</div>;
}

// 진단 알약 — 핵심 수치 강조 (하락 주황 ▼ / 상승 초록 ▲)
function DiagPill({ tone, text }: { tone: Tone; text: string }) {
  const up = tone === "up";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", color: "#fff", fontSize: 17, fontWeight: 700, letterSpacing: -0.2, padding: "8px 16px", borderRadius: 999, background: up ? T.up : T.down, boxShadow: up ? "0 6px 16px rgba(30,140,92,.35)" : "0 6px 16px rgba(224,90,45,.35)" }}>
      <span style={{ fontSize: 19, lineHeight: 1, marginRight: 8 }}>{up ? "▲" : "▼"}</span>{text}
    </span>
  );
}

function Metric({ label, value, sub, subColor }: { label: string; value: string; sub: string; subColor: string }) {
  return (
    <div style={{ background: T.surfaceAlt, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 12, color: T.sub }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 600, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 500, marginTop: 4, color: subColor }}>{sub}</div>
    </div>
  );
}

function Sum({ value, label, valueColor }: { value: string; label: string; valueColor?: string }) {
  return (
    <div style={{ background: T.surfaceAlt, borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
      <div style={{ fontSize: 19, fontWeight: 700, color: valueColor ?? T.ink }}>{value}</div>
      <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ---- 실연동 상태 카드 (MOCK_MODE=off 로딩/빈/에러) --------------------------
function RemoteStatus({ state }: { state: RemoteState }) {
  const isError = state.status === "error";
  const text =
    state.status === "loading" ? "오늘 날씨·제안을 불러오는 중…"
    : state.status === "empty" ? state.message
    : state.status === "error" ? `불러오기 실패 · ${state.message}`
    : "";
  const hint =
    state.status === "empty"
      ? "서버에서 오늘 제안을 아직 만들지 않았어요. POST /proposal/generate 로 생성하거나 06:30 자동 잡을 기다리세요."
      : state.status === "error"
        ? "서버가 켜져 있는지, VITE_API_BASE 설정을 확인하세요."
        : "";
  return (
    <div className="wp-view" style={{ marginTop: 12, background: T.surface, borderRadius: 16, padding: 28, boxShadow: T.shadowCard, textAlign: "center" }}>
      <div style={{ fontSize: 30 }}>{state.status === "loading" ? "⏳" : isError ? "⚠️" : "🗓️"}</div>
      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 10, color: isError ? T.downText : T.ink }}>{text}</div>
      {hint && <p style={{ fontSize: 12.5, color: T.sub, marginTop: 8, lineHeight: 1.6 }}>{hint}</p>}
    </div>
  );
}
