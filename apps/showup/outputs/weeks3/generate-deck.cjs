const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const pres = new pptxgen();

// ── Palette: Midnight Executive (navy + ice blue + white) ──
const NAVY = "1E2761";
const ICE = "CADCFC";
const WHITE = "FFFFFF";
const DARK = "0F172A";
const SLATE = "475569";
const LIGHT_BG = "F8FAFC";
const RED = "DC2626";
const AMBER = "F59E0B";
const GREEN = "16A34A";
const BLUE = "2563EB";

pres.layout = "LAYOUT_WIDE"; // 13.33" × 7.5"
pres.defineSlideMaster({
  title: "Content",
  background: { color: WHITE },
  objects: [
    { rect: { x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: NAVY } } },
    { text: { text: "ShowUp · Week 3", options: { x: 10.5, y: 7.05, w: 2.0, h: 0.3, fontSize: 9, color: SLATE, align: "right" } } },
  ],
  slideNumber: { x: 12.6, y: 7.05, w: 0.5, h: 0.3, fontSize: 9, color: SLATE, align: "right" },
});

pres.defineSlideMaster({
  title: "Section",
  background: { color: NAVY },
  slideNumber: { x: 12.6, y: 7.05, w: 0.5, h: 0.3, fontSize: 9, color: ICE, align: "right" },
});

const screenshotsDir = path.join(__dirname);

function imgBase64(filename) {
  const fp = path.join(screenshotsDir, filename);
  const buf = fs.readFileSync(fp);
  return "image/png;base64," + buf.toString("base64");
}

// ═══════════════════════════════════════════════════
// Slide 1 — Title (dark)
// ═══════════════════════════════════════════════════
{
  const slide = pres.addSlide({ masterName: "Section" });
  slide.addText("ShowUp", {
    x: 0.8, y: 1.5, w: 11, h: 1.2,
    fontSize: 54, bold: true, color: WHITE, fontFace: "Arial",
  });
  slide.addText("노쇼·악성 고객 이력 관리 및 위험도 경고 웹서비스", {
    x: 0.8, y: 2.7, w: 11, h: 0.6,
    fontSize: 22, color: ICE, fontFace: "Arial",
  });
  slide.addText("Week 3 최종 발표 — 8~11일차 성과", {
    x: 0.8, y: 3.5, w: 11, h: 0.5,
    fontSize: 18, color: ICE, fontFace: "Arial", italic: true,
  });
  slide.addText([
    { text: "N167 채민석", options: { fontSize: 16, color: WHITE, bold: true } },
    { text: "\n2026.07.24 (금)", options: { fontSize: 14, color: ICE } },
  ], {
    x: 0.8, y: 5.5, w: 6, h: 1, fontFace: "Arial",
  });
  slide.addText("Hermes Agent 프레임워크 + Ollama Pro 모델", {
    x: 7.5, y: 6.8, w: 5, h: 0.4,
    fontSize: 12, color: ICE, align: "right", fontFace: "Arial",
  });
}

// ═══════════════════════════════════════════════════
// Slide 2 — Agenda
// ═══════════════════════════════════════════════════
{
  const slide = pres.addSlide({ masterName: "Content" });
  slide.addText("오늘 발표 순서", {
    x: 0.6, y: 0.4, w: 12, h: 0.6,
    fontSize: 36, bold: true, color: NAVY, fontFace: "Arial",
  });

  const items = [
    { num: "01", title: "문제 정의", desc: "소상공인이 겪는 노쇼·악성 고객 문제" },
    { num: "02", title: "핵심 기능 & 위험도 설계", desc: "MVP 2개 + 가중치 기반 위험도" },
    { num: "03", title: "기술 스택 & 아키텍처", desc: "React + Firebase + AI 4세션" },
    { num: "04", title: "3주차 개발 성과", desc: "8~11일차: 위험도 UI·대시보드·QA·배포" },
    { num: "05", title: "라이브 데모", desc: "showup-project.web.app 시연" },
    { num: "06", title: "AI 에이전트 운영 & 회고", desc: "Hermes Agent 4세션 협업 구조" },
  ];

  items.forEach((item, i) => {
    const y = 1.3 + i * 0.85;
    // Number circle
    slide.addShape(pres.ShapeType.ellipse, {
      x: 0.8, y: y, w: 0.55, h: 0.55,
      fill: { color: NAVY },
    });
    slide.addText(item.num, {
      x: 0.8, y: y, w: 0.55, h: 0.55,
      fontSize: 14, bold: true, color: WHITE, align: "center", valign: "middle", fontFace: "Arial",
    });
    // Title
    slide.addText(item.title, {
      x: 1.6, y: y - 0.02, w: 4, h: 0.35,
      fontSize: 18, bold: true, color: DARK, fontFace: "Arial",
    });
    // Desc
    slide.addText(item.desc, {
      x: 1.6, y: y + 0.28, w: 8, h: 0.3,
      fontSize: 13, color: SLATE, fontFace: "Arial",
    });
  });
}

// ═══════════════════════════════════════════════════
// Slide 3 — Problem Definition
// ═══════════════════════════════════════════════════
{
  const slide = pres.addSlide({ masterName: "Content" });
  slide.addText("문제 정의", {
    x: 0.6, y: 0.4, w: 12, h: 0.6,
    fontSize: 36, bold: true, color: NAVY, fontFace: "Arial",
  });

  // Quote box
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 1.4, w: 11.7, h: 1.6,
    fill: { color: LIGHT_BG },
    line: { color: ICE, width: 1 },
    rectRadius: 0.1,
  });
  slide.addText([
    { text: "예약제로 운영하는 소상공인이 노쇼·상습 지각·폭언·환불 분쟁 같은\n문제 고객을 반복해서 겪으면서도, 기록하고 예약 전에 확인할 수단이 없어\n같은 피해를 계속 반복한다.", options: { fontSize: 16, color: DARK, fontFace: "Arial" } },
  ], {
    x: 1.2, y: 1.6, w: 11, h: 1.2, valign: "middle",
  });

  // Market gap
  slide.addText("시장 공백", {
    x: 0.8, y: 3.3, w: 5.5, h: 0.4,
    fontSize: 20, bold: true, color: NAVY, fontFace: "Arial",
  });
  slide.addText([
    { text: "• 기존 예약 앱(네이버예약, 캐치테이블)은 예약 접수에 집중\n", options: { fontSize: 14, color: DARK, fontFace: "Arial" } },
    { text: "• 문제 고객 이력 관리·사전 경고 기능 부재\n", options: { fontSize: 14, color: DARK, fontFace: "Arial" } },
    { text: "• 노쇼뿐 아니라 악성 행동 전반을 기록 대상으로 확장\n", options: { fontSize: 14, color: DARK, fontFace: "Arial" } },
  ], {
    x: 0.8, y: 3.8, w: 5.5, h: 1.5, paraSpaceAfter: 6, fontFace: "Arial",
  });

  // Core principle
  slide.addText("ShowUp의 핵심 원칙", {
    x: 7.0, y: 3.3, w: 5.5, h: 0.4,
    fontSize: 20, bold: true, color: NAVY, fontFace: "Arial",
  });
  slide.addText([
    { text: "자동 차단이 아닌 참고 지표\n", options: { fontSize: 16, color: NAVY, bold: true, fontFace: "Arial" } },
    { text: "사장님이 최종 판단 — 위험도로 판단을 돕는 도구\n", options: { fontSize: 14, color: DARK, fontFace: "Arial" } },
    { text: "개선된 고객은 점수 회복 → 등급 하향 (낙인 방지)\n", options: { fontSize: 14, color: DARK, fontFace: "Arial" } },
    { text: "업계 관행(2회 경고·3회 제한)보다 완화된 기준\n", options: { fontSize: 14, color: DARK, fontFace: "Arial" } },
  ], {
    x: 7.0, y: 3.8, w: 5.5, h: 1.8, paraSpaceAfter: 6, fontFace: "Arial",
  });
}

// ═══════════════════════════════════════════════════
// Slide 4 — MVP 2 Features
// ═══════════════════════════════════════════════════
{
  const slide = pres.addSlide({ masterName: "Content" });
  slide.addText("핵심 기능 — MVP 2개", {
    x: 0.6, y: 0.4, w: 12, h: 0.6,
    fontSize: 36, bold: true, color: NAVY, fontFace: "Arial",
  });

  // Feature 1
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 1.3, w: 5.6, h: 2.8,
    fill: { color: LIGHT_BG },
    line: { color: NAVY, width: 1.5 },
    rectRadius: 0.12,
  });
  slide.addText("1", {
    x: 1.0, y: 1.5, w: 0.7, h: 0.7,
    fontSize: 36, bold: true, color: NAVY, fontFace: "Arial",
  });
  slide.addText("고객 이벤트 기록", {
    x: 1.8, y: 1.5, w: 4.5, h: 0.5,
    fontSize: 20, bold: true, color: DARK, fontFace: "Arial",
  });
  slide.addText([
    { text: "• 예약 상태 원터치 기록 (방문/노쇼/당일취소)\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
    { text: "• 악성 행동 사건 기록 (카테고리 4종 + 사실 메모)\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
    { text: "• 정상 방문 시 점수 −1 회복\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
    { text: "• 폭언·위협·분쟁·무리한 요구 분류\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
  ], {
    x: 1.0, y: 2.3, w: 5.2, h: 1.7, paraSpaceAfter: 6, fontFace: "Arial",
  });

  // Feature 2
  slide.addShape(pres.ShapeType.roundRect, {
    x: 6.9, y: 1.3, w: 5.6, h: 2.8,
    fill: { color: LIGHT_BG },
    line: { color: NAVY, width: 1.5 },
    rectRadius: 0.12,
  });
  slide.addText("2", {
    x: 7.1, y: 1.5, w: 0.7, h: 0.7,
    fontSize: 36, bold: true, color: NAVY, fontFace: "Arial",
  });
  slide.addText("위험도 조회 + 자동 경고", {
    x: 7.9, y: 1.5, w: 4.5, h: 0.5,
    fontSize: 20, bold: true, color: DARK, fontFace: "Arial",
  });
  slide.addText([
    { text: "• 전화 뒤 4자리 / 이름 검색\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
    { text: "• 위험도 3등급 표시 (안심/주의/위험)\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
    { text: "• 노쇼 3회+ 또는 abuse 1회+ → 경고 배너 강제\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
    { text: "• 대시보드 주의 고객 Top 5 자동 노출\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
  ], {
    x: 7.1, y: 2.3, w: 5.2, h: 1.7, paraSpaceAfter: 6, fontFace: "Arial",
  });

  // 필수성/적합성
  slide.addText("필수성", {
    x: 0.8, y: 4.4, w: 5.6, h: 0.35,
    fontSize: 14, bold: true, color: NAVY, fontFace: "Arial",
  });
  slide.addText("기록 없으면 서비스가 동작하지 않음 — 데이터 축적의 원천", {
    x: 0.8, y: 4.7, w: 5.6, h: 0.35,
    fontSize: 12, color: SLATE, fontFace: "Arial",
  });
  slide.addText("적합성", {
    x: 6.9, y: 4.4, w: 5.6, h: 0.35,
    fontSize: 14, bold: true, color: NAVY, fontFace: "Arial",
  });
  slide.addText("\"예약 받기 전 확인\" = 문제 정의에 직결되는 해결책", {
    x: 6.9, y: 4.7, w: 5.6, h: 0.35,
    fontSize: 12, color: SLATE, fontFace: "Arial",
  });

  // Legal guardrails
  slide.addText("법적 가드레일", {
    x: 0.8, y: 5.4, w: 11.7, h: 0.4,
    fontSize: 16, bold: true, color: NAVY, fontFace: "Arial",
  });
  slide.addText([
    { text: "사건은 사전 정의 카테고리 선택식 (주관적 비방 방지)  ·  가게 간 공유 없음 (개인정보보호법 §17)  ·  \"블랙리스트\" 용어 금지 → \"고객 이력\" / \"참고 지표\"  ·  열람·정정·삭제 요청 대응 (Phase 2)", options: { fontSize: 12, color: SLATE, fontFace: "Arial" } },
  ], {
    x: 0.8, y: 5.8, w: 11.7, h: 0.8, fontFace: "Arial",
  });
}

// ═══════════════════════════════════════════════════
// Slide 5 — Risk Score Design
// ═══════════════════════════════════════════════════
{
  const slide = pres.addSlide({ masterName: "Content" });
  slide.addText("위험도 설계 — ShowUp의 차별점", {
    x: 0.6, y: 0.4, w: 12, h: 0.6,
    fontSize: 36, bold: true, color: NAVY, fontFace: "Arial",
  });

  // Score table
  const tableRows = [
    [
      { text: "이벤트", options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 13, fontFace: "Arial", align: "center" } },
      { text: "점수", options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 13, fontFace: "Arial", align: "center" } },
      { text: "이벤트", options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 13, fontFace: "Arial", align: "center" } },
      { text: "점수", options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 13, fontFace: "Arial", align: "center" } },
    ],
    [
      { text: "노쇼 (no-show)", options: { fontSize: 12, fontFace: "Arial", color: DARK } },
      { text: "+8", options: { fontSize: 14, bold: true, fontFace: "Arial", color: RED, align: "center" } },
      { text: "폭언·위협 (abuse)", options: { fontSize: 12, fontFace: "Arial", color: DARK } },
      { text: "+10", options: { fontSize: 14, bold: true, fontFace: "Arial", color: RED, align: "center" } },
    ],
    [
      { text: "당일 취소 (late-cancel)", options: { fontSize: 12, fontFace: "Arial", color: DARK } },
      { text: "+4", options: { fontSize: 14, bold: true, fontFace: "Arial", color: AMBER, align: "center" } },
      { text: "환불·결제 분쟁 (dispute)", options: { fontSize: 12, fontFace: "Arial", color: DARK } },
      { text: "+6", options: { fontSize: 14, bold: true, fontFace: "Arial", color: AMBER, align: "center" } },
    ],
    [
      { text: "상습 지각 30분+ (late)", options: { fontSize: 12, fontFace: "Arial", color: DARK } },
      { text: "+2", options: { fontSize: 14, bold: true, fontFace: "Arial", color: AMBER, align: "center" } },
      { text: "무리한 요구 반복 (unreasonable)", options: { fontSize: 12, fontFace: "Arial", color: DARK } },
      { text: "+4", options: { fontSize: 14, bold: true, fontFace: "Arial", color: AMBER, align: "center" } },
    ],
    [
      { text: "정상 방문 (visited)", options: { fontSize: 12, bold: true, fontFace: "Arial", color: GREEN } },
      { text: "−1", options: { fontSize: 14, bold: true, fontFace: "Arial", color: GREEN, align: "center" } },
      { text: "최근 30일 내 노쇼", options: { fontSize: 12, fontFace: "Arial", color: DARK } },
      { text: "+5", options: { fontSize: 14, bold: true, fontFace: "Arial", color: AMBER, align: "center" } },
    ],
  ];
  slide.addTable(tableRows, {
    x: 0.8, y: 1.3, w: 7.2, h: 2.5,
    colW: [2.2, 1.0, 2.8, 1.2],
    border: { type: "solid", color: ICE, pt: 1 },
    valign: "middle",
  });

  // Risk levels
  slide.addText("위험도 3등급", {
    x: 8.4, y: 1.3, w: 4, h: 0.4,
    fontSize: 18, bold: true, color: NAVY, fontFace: "Arial",
  });

  const levels = [
    { label: "안심 (low)", range: "0–23", color: GREEN },
    { label: "주의 (medium)", range: "24–39", color: AMBER },
    { label: "위험 (high)", range: "40+", color: RED },
  ];
  levels.forEach((lv, i) => {
    const y = 1.8 + i * 0.65;
    slide.addShape(pres.ShapeType.roundRect, {
      x: 8.4, y: y, w: 4, h: 0.55,
      fill: { color: lv.color },
      rectRadius: 0.08,
    });
    slide.addText([
      { text: lv.label, options: { fontSize: 14, bold: true, color: WHITE, fontFace: "Arial" } },
      { text: "  " + lv.range + "점", options: { fontSize: 13, color: WHITE, fontFace: "Arial" } },
    ], {
      x: 8.6, y: y, w: 3.6, h: 0.55, valign: "middle", fontFace: "Arial",
    });
  });

  // Special rules
  slide.addText("특별 규칙", {
    x: 8.4, y: 3.9, w: 4, h: 0.35,
    fontSize: 14, bold: true, color: NAVY, fontFace: "Arial",
  });
  slide.addText([
    { text: "• abuse 1회+ → 최소 '주의' 보장\n", options: { fontSize: 12, color: DARK, fontFace: "Arial" } },
    { text: "• 정상 방문 시 점수 차감 → 등급 회복\n", options: { fontSize: 12, color: DARK, fontFace: "Arial" } },
    { text: "• 총점 최소 0 (음수 불가)\n", options: { fontSize: 12, color: DARK, fontFace: "Arial" } },
  ], {
    x: 8.4, y: 4.25, w: 4, h: 1.2, paraSpaceAfter: 4, fontFace: "Arial",
  });

  // Bottom callout
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 4.5, w: 7.2, h: 1.8,
    fill: { color: NAVY },
    rectRadius: 0.1,
  });
  slide.addText([
    { text: "업계 관행 vs ShowUp\n", options: { fontSize: 14, bold: true, color: WHITE, fontFace: "Arial" } },
    { text: "업계: 2회 노쇼 시 경고, 3회 시 예약 제한\n", options: { fontSize: 13, color: ICE, fontFace: "Arial" } },
    { text: "ShowUp: 3회 기준 + 제한 대신 경고·판단 위임\n", options: { fontSize: 13, color: WHITE, bold: true, fontFace: "Arial" } },
    { text: "→ 사장님 재량 보존 + 법적 리스크 감소 + 낙인 방지", options: { fontSize: 13, color: ICE, italic: true, fontFace: "Arial" } },
  ], {
    x: 1.1, y: 4.65, w: 6.6, h: 1.5, paraSpaceAfter: 4, fontFace: "Arial",
  });
}

// ═══════════════════════════════════════════════════
// Slide 6 — Tech Stack & Architecture
// ═══════════════════════════════════════════════════
{
  const slide = pres.addSlide({ masterName: "Content" });
  slide.addText("기술 스택 & 아키텍처", {
    x: 0.6, y: 0.4, w: 12, h: 0.6,
    fontSize: 36, bold: true, color: NAVY, fontFace: "Arial",
  });

  // Left: Stack table
  const stackRows = [
    [
      { text: "영역", options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 12, fontFace: "Arial", align: "center" } },
      { text: "선택", options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 12, fontFace: "Arial", align: "center" } },
      { text: "이유", options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 12, fontFace: "Arial", align: "center" } },
    ],
    [
      { text: "프론트엔드", options: { fontSize: 11, fontFace: "Arial", color: DARK } },
      { text: "React+Vite+TS+Tailwind", options: { fontSize: 11, fontFace: "Arial", color: DARK } },
      { text: "빠른 개발, 타입 안정성", options: { fontSize: 11, fontFace: "Arial", color: SLATE } },
    ],
    [
      { text: "상태관리", options: { fontSize: 11, fontFace: "Arial", color: DARK } },
      { text: "TanStack Query + Zustand", options: { fontSize: 11, fontFace: "Arial", color: DARK } },
      { text: "서버/UI 상태 분리", options: { fontSize: 11, fontFace: "Arial", color: SLATE } },
    ],
    [
      { text: "폼", options: { fontSize: 11, fontFace: "Arial", color: DARK } },
      { text: "RHF + Zod", options: { fontSize: 11, fontFace: "Arial", color: DARK } },
      { text: "검증 + 타입 연동", options: { fontSize: 11, fontFace: "Arial", color: SLATE } },
    ],
    [
      { text: "백엔드", options: { fontSize: 11, fontFace: "Arial", color: DARK } },
      { text: "Firebase (Auth/Firestore/Hosting)", options: { fontSize: 11, fontFace: "Arial", color: DARK } },
      { text: "가게 격리, 3주 내 배포", options: { fontSize: 11, fontFace: "Arial", color: SLATE } },
    ],
    [
      { text: "AI 에이전트", options: { fontSize: 11, fontFace: "Arial", color: DARK } },
      { text: "Hermes Agent + Ollama Pro", options: { fontSize: 11, fontFace: "Arial", color: DARK } },
      { text: "4세션 역할 분리 개발", options: { fontSize: 11, fontFace: "Arial", color: SLATE } },
    ],
  ];
  slide.addTable(stackRows, {
    x: 0.8, y: 1.3, w: 6.5,
    colW: [1.3, 2.8, 2.4],
    border: { type: "solid", color: ICE, pt: 1 },
    valign: "middle",
    rowH: 0.55,
  });

  // Right: Data flow diagram
  slide.addText("데이터 흐름", {
    x: 7.7, y: 1.3, w: 5, h: 0.4,
    fontSize: 18, bold: true, color: NAVY, fontFace: "Arial",
  });

  // Flow boxes
  const flowSteps = [
    { y: 1.8, label: "화면 (React)", sub: "Pages + services/*.ts", color: BLUE },
    { y: 2.65, label: "Firestore DB", sub: "stores → customers → reservations/incidents", color: AMBER },
    { y: 3.5, label: "riskRefresh.ts", sub: "calculateRiskStats() 순수 함수", color: NAVY },
    { y: 4.35, label: "위험도 갱신", sub: "RiskBadge · RiskAlertBanner 표시", color: GREEN },
  ];
  flowSteps.forEach((step, i) => {
    slide.addShape(pres.ShapeType.roundRect, {
      x: 7.7, y: step.y, w: 4.8, h: 0.7,
      fill: { color: step.color },
      rectRadius: 0.08,
    });
    slide.addText([
      { text: step.label + "\n", options: { fontSize: 13, bold: true, color: WHITE, fontFace: "Arial" } },
      { text: step.sub, options: { fontSize: 10, color: ICE, fontFace: "Arial" } },
    ], {
      x: 7.9, y: step.y, w: 4.4, h: 0.7, valign: "middle", fontFace: "Arial",
    });
    if (i < flowSteps.length - 1) {
      slide.addText("↓", {
        x: 9.8, y: step.y + 0.65, w: 0.5, h: 0.25,
        fontSize: 16, bold: true, color: SLATE, align: "center", fontFace: "Arial",
      });
    }
  });

  // Firestore data model
  slide.addText("Firestore 컬렉션 구조", {
    x: 0.8, y: 5.3, w: 11.7, h: 0.4,
    fontSize: 16, bold: true, color: NAVY, fontFace: "Arial",
  });
  slide.addText([
    { text: "stores/{storeId}/customers/{customerId}/incidents/{incidentId}\n", options: { fontSize: 12, color: DARK, fontFace: "Arial", bold: true } },
    { text: "stores/{storeId}/reservations/{reservationId}\n", options: { fontSize: 12, color: DARK, fontFace: "Arial", bold: true } },
    { text: "storeId = user.uid → 가게 간 데이터 격리 (Firestore Rules ownerUid 검증)\n", options: { fontSize: 11, color: SLATE, fontFace: "Arial" } },
    { text: "riskStats 비정규화 캐시 → 검색 1회 = 읽기 1회 (비용 최적화)", options: { fontSize: 11, color: SLATE, fontFace: "Arial" } },
  ], {
    x: 0.8, y: 5.7, w: 11.7, h: 1.3, paraSpaceAfter: 4, fontFace: "Arial",
  });
}

// ═══════════════════════════════════════════════════
// Slide 7 — Week 3 Progress Timeline
// ═══════════════════════════════════════════════════
{
  const slide = pres.addSlide({ masterName: "Content" });
  slide.addText("3주차 개발 성과 (8~11일차)", {
    x: 0.6, y: 0.4, w: 12, h: 0.6,
    fontSize: 36, bold: true, color: NAVY, fontFace: "Arial",
  });

  // Timeline
  const days = [
    {
      day: "8일차", date: "7/20 월", color: BLUE,
      items: ["RiskAlertBanner 구현", "대시보드 요약 카드 4개", "주의 고객 Top 5 목록", "Week 1 통합 E2E 확인"],
    },
    {
      day: "9일차", date: "7/21 화", color: AMBER,
      items: ["로딩/에러/빈 상태 UI 전 화면", "고객 상세 페이지 완성", "예약 목록 날짜별 필터", "침투 테스트 최종 회귀"],
    },
    {
      day: "10일차", date: "7/22 수", color: NAVY,
      items: ["모바일 QA 375px 전 화면", "Lighthouse 90+ · 코드 스플리팅", "접근성·에러 페이지(404/500)", "보안 규칙 회귀 10개 PASS"],
    },
    {
      day: "11일차", date: "7/23 목", color: GREEN,
      items: ["Firebase Hosting 배포 완료", "통합 QA 버그 수정(P0/P1)", "랜딩 페이지 구현", "showcase.json + 스크린샷 4장"],
    },
  ];

  days.forEach((d, i) => {
    const x = 0.6 + i * 3.1;
    // Day header
    slide.addShape(pres.ShapeType.roundRect, {
      x: x, y: 1.3, w: 2.9, h: 0.65,
      fill: { color: d.color },
      rectRadius: 0.08,
    });
    slide.addText([
      { text: d.day + "\n", options: { fontSize: 14, bold: true, color: WHITE, fontFace: "Arial" } },
      { text: d.date, options: { fontSize: 11, color: ICE, fontFace: "Arial" } },
    ], {
      x: x + 0.15, y: 1.3, w: 2.6, h: 0.65, valign: "middle", fontFace: "Arial",
    });
    // Items
    d.items.forEach((item, j) => {
      slide.addText("• " + item, {
        x: x + 0.1, y: 2.15 + j * 0.55, w: 2.8, h: 0.5,
        fontSize: 11, color: DARK, fontFace: "Arial", valign: "top",
      });
    });
  });

  // Key metrics
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 5.0, w: 12.1, h: 1.8,
    fill: { color: LIGHT_BG },
    line: { color: NAVY, width: 1 },
    rectRadius: 0.1,
  });

  const metrics = [
    { num: "8KB", label: "메인 청크 (코드 스플리팅)", color: NAVY },
    { num: "10/10", label: "보안 규칙 회귀 테스트", color: GREEN },
    { num: "0", label: "마스킹 누락 (전화번호 노출)", color: RED },
    { num: "PASS", label: "Lighthouse 90+", color: BLUE },
  ];
  metrics.forEach((m, i) => {
    const x = 0.9 + i * 3.0;
    slide.addText(m.num, {
      x: x, y: 5.2, w: 2.7, h: 0.6,
      fontSize: 32, bold: true, color: m.color, align: "center", fontFace: "Arial",
    });
    slide.addText(m.label, {
      x: x, y: 5.8, w: 2.7, h: 0.6,
      fontSize: 12, color: SLATE, align: "center", fontFace: "Arial",
    });
  });

  slide.addText("배포 URL: https://showup-project.web.app", {
    x: 0.9, y: 6.4, w: 11, h: 0.3,
    fontSize: 13, bold: true, color: NAVY, fontFace: "Arial",
  });
}

// ═══════════════════════════════════════════════════
// Slide 8 — Landing Page Screenshot
// ═══════════════════════════════════════════════════
{
  const slide = pres.addSlide({ masterName: "Content" });
  slide.addText("데모 — 랜딩 페이지", {
    x: 0.6, y: 0.4, w: 12, h: 0.6,
    fontSize: 36, bold: true, color: NAVY, fontFace: "Arial",
  });
  slide.addImage({
    data: imgBase64("landing.png"),
    x: 2.0, y: 1.2, w: 9.3, h: 5.5,
    sizing: { type: "contain", w: 9.3, h: 5.5 },
  });
  slide.addText("서비스 소개 · 4대 핵심 기능 · CTA (무료 가입)", {
    x: 0.6, y: 6.8, w: 12, h: 0.3,
    fontSize: 13, color: SLATE, align: "center", fontFace: "Arial", italic: true,
  });
}

// ═══════════════════════════════════════════════════
// Slide 9 — Dashboard Screenshot
// ═══════════════════════════════════════════════════
{
  const slide = pres.addSlide({ masterName: "Content" });
  slide.addText("데모 — 대시보드", {
    x: 0.6, y: 0.4, w: 12, h: 0.6,
    fontSize: 36, bold: true, color: NAVY, fontFace: "Arial",
  });
  slide.addImage({
    data: imgBase64("dashboard.png"),
    x: 2.5, y: 1.2, w: 8.3, h: 5.5,
    sizing: { type: "contain", w: 8.3, h: 5.5 },
  });
  slide.addText("요약 카드 4개 (오늘 예약·방문·노쇼·월 노쇼율) + 주의 고객 + 오늘 예약", {
    x: 0.6, y: 6.8, w: 12, h: 0.3,
    fontSize: 13, color: SLATE, align: "center", fontFace: "Arial", italic: true,
  });
}

// ═══════════════════════════════════════════════════
// Slide 10 — Customers Screenshot
// ═══════════════════════════════════════════════════
{
  const slide = pres.addSlide({ masterName: "Content" });
  slide.addText("데모 — 고객 관리", {
    x: 0.6, y: 0.4, w: 12, h: 0.6,
    fontSize: 36, bold: true, color: NAVY, fontFace: "Arial",
  });
  slide.addImage({
    data: imgBase64("customers.png"),
    x: 2.5, y: 1.2, w: 8.3, h: 5.5,
    sizing: { type: "contain", w: 8.3, h: 5.5 },
  });
  slide.addText("전화 뒤 4자리 / 이름 검색 · RiskBadge 3등급 · 마스킹 번호 · 신규 등록", {
    x: 0.6, y: 6.8, w: 12, h: 0.3,
    fontSize: 13, color: SLATE, align: "center", fontFace: "Arial", italic: true,
  });
}

// ═══════════════════════════════════════════════════
// Slide 11 — Reservations Screenshot
// ═══════════════════════════════════════════════════
{
  const slide = pres.addSlide({ masterName: "Content" });
  slide.addText("데모 — 예약 관리", {
    x: 0.6, y: 0.4, w: 12, h: 0.6,
    fontSize: 36, bold: true, color: NAVY, fontFace: "Arial",
  });
  slide.addImage({
    data: imgBase64("reservations.png"),
    x: 2.5, y: 1.2, w: 8.3, h: 5.5,
    sizing: { type: "contain", w: 8.3, h: 5.5 },
  });
  slide.addText("날짜·상태 필터 · 방문/노쇼/취소 원터치 · 위험도 자동 갱신", {
    x: 0.6, y: 6.8, w: 12, h: 0.3,
    fontSize: 13, color: SLATE, align: "center", fontFace: "Arial", italic: true,
  });
}

// ═══════════════════════════════════════════════════
// Slide 12 — AI Agent Architecture
// ═══════════════════════════════════════════════════
{
  const slide = pres.addSlide({ masterName: "Content" });
  slide.addText("AI 에이전트 운영 구조", {
    x: 0.6, y: 0.4, w: 12, h: 0.6,
    fontSize: 36, bold: true, color: NAVY, fontFace: "Arial",
  });

  // 4 session cards
  const sessions = [
    { name: "리드 (LEAD)", model: "GLM 5.2", role: "기획·통합·일정·배포", color: "F59E0B", x: 0.8 },
    { name: "프론트엔드 (FE)", model: "Qwen 3.5", role: "UI·컴포넌트·라우팅·QA", color: "2563EB", x: 3.9 },
    { name: "백엔드 (BE)", model: "Kimi K2.7 Code", role: "Firestore·로직·인덱스", color: "16A34A", x: 7.0 },
    { name: "보안 (SEC)", model: "GLM 5.2", role: "Rules·침투테스트·법무", color: "DC2626", x: 10.1 },
  ];
  sessions.forEach((s) => {
    slide.addShape(pres.ShapeType.roundRect, {
      x: s.x, y: 1.3, w: 2.6, h: 2.2,
      fill: { color: LIGHT_BG },
      line: { color: s.color, width: 2 },
      rectRadius: 0.1,
    });
    // Color top bar
    slide.addShape(pres.ShapeType.rect, {
      x: s.x, y: 1.3, w: 2.6, h: 0.5,
      fill: { color: s.color },
    });
    slide.addText(s.name, {
      x: s.x, y: 1.3, w: 2.6, h: 0.5,
      fontSize: 14, bold: true, color: WHITE, align: "center", valign: "middle", fontFace: "Arial",
    });
    slide.addText(s.model, {
      x: s.x + 0.15, y: 1.9, w: 2.3, h: 0.35,
      fontSize: 12, bold: true, color: s.color, align: "center", fontFace: "Arial",
    });
    slide.addText(s.role, {
      x: s.x + 0.15, y: 2.3, w: 2.3, h: 1.1,
      fontSize: 11, color: DARK, align: "center", fontFace: "Arial", valign: "top",
    });
  });

  // Collaboration rules
  slide.addText("협업 규칙", {
    x: 0.8, y: 3.8, w: 11.7, h: 0.4,
    fontSize: 18, bold: true, color: NAVY, fontFace: "Arial",
  });
  slide.addText([
    { text: "• 인터페이스 우선: BE가 schema.ts 확정 → FE는 mock으로 병행 개발 — 세션 간 대기 최소화\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
    { text: "• 문서 기반 가드레일: 각 세션이 건드릴/건드리지 말 파일을 문서로 명시\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
    { text: "• 단일 브랜치 역할 분리: N167_채민석 브랜치에서 세션별 커밋 접두어 (FE-/BE-/SEC-/LEAD-)\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
    { text: "• 통합 QA: LEAD가 lint·typecheck·build·E2E 시나리오로 전체 검증\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
  ], {
    x: 0.8, y: 4.2, w: 11.7, h: 2.0, paraSpaceAfter: 6, fontFace: "Arial",
  });

  // Framework callout
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 6.2, w: 11.7, h: 0.7,
    fill: { color: NAVY },
    rectRadius: 0.08,
  });
  slide.addText("Hermes Agent 프레임워크 + Ollama Pro 모델 — Claude 구독 만료 후 이관, 로컬에서 4세션 동시 운영", {
    x: 1.0, y: 6.2, w: 11.3, h: 0.7,
    fontSize: 13, color: WHITE, align: "center", valign: "middle", fontFace: "Arial", italic: true,
  });
}

// ═══════════════════════════════════════════════════
// Slide 13 — Security & Quality
// ═══════════════════════════════════════════════════
{
  const slide = pres.addSlide({ masterName: "Content" });
  slide.addText("보안 & 품질 검증", {
    x: 0.6, y: 0.4, w: 12, h: 0.6,
    fontSize: 36, bold: true, color: NAVY, fontFace: "Arial",
  });

  // Left: Security
  slide.addText("보안", {
    x: 0.8, y: 1.2, w: 5.5, h: 0.4,
    fontSize: 20, bold: true, color: "DC2626", fontFace: "Arial",
  });
  slide.addText([
    { text: "• 가게 격리: isStoreOwner(storeId) → ownerUid 검증\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
    { text: "• 침투 테스트: 타 가게 접근, riskStats 위조, 사건 위조 전부 거부\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
    { text: "• 회귀 테스트 10개 PASS (@firebase/rules-unit-testing)\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
    { text: "• 전화번호 마스킹: 원본 노출 경로 0건\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
    { text: "• \"블랙리스트\" 용어 0건 → \"고객 이력\" / \"참고 지표\"\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
    { text: "• riskStats 클라이언트 쓰기 허용 (Spark 요금제)\n", options: { fontSize: 13, color: SLATE, fontFace: "Arial" } },
  ], {
    x: 0.8, y: 1.7, w: 5.5, h: 3.5, paraSpaceAfter: 8, fontFace: "Arial",
  });

  // Right: Quality
  slide.addText("품질", {
    x: 7.0, y: 1.2, w: 5.5, h: 0.4,
    fontSize: 20, bold: true, color: "2563EB", fontFace: "Arial",
  });
  slide.addText([
    { text: "• lint: warning 0, error 0\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
    { text: "• typecheck: tsc -b 에러 0\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
    { text: "• build: vite build 통과 (메인 청크 8KB)\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
    { text: "• 코드 스플리팅: React.lazy + Suspense, manualChunks\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
    { text: "• 모바일 QA: 375px 전 화면, 터치 타겟 44px+\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
    { text: "• 접근성: focus-visible 글로벌, 색 대비 통과\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
    { text: "• 에러 페이지: 404 NotFound, 500 ServerError\n", options: { fontSize: 13, color: DARK, fontFace: "Arial" } },
  ], {
    x: 7.0, y: 1.7, w: 5.5, h: 3.5, paraSpaceAfter: 8, fontFace: "Arial",
  });

  // Unit tests
  slide.addText("단위 테스트", {
    x: 0.8, y: 5.3, w: 11.7, h: 0.4,
    fontSize: 18, bold: true, color: NAVY, fontFace: "Arial",
  });

  const testRows = [
    [
      { text: "테스트", options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 12, fontFace: "Arial", align: "center" } },
      { text: "개수", options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 12, fontFace: "Arial", align: "center" } },
      { text: "상태", options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 12, fontFace: "Arial", align: "center" } },
      { text: "내용", options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 12, fontFace: "Arial", align: "center" } },
    ],
    [
      { text: "risk.ts", options: { fontSize: 11, fontFace: "Arial", color: DARK } },
      { text: "13개", options: { fontSize: 12, fontFace: "Arial", color: DARK, align: "center" } },
      { text: "PASS", options: { fontSize: 12, bold: true, fontFace: "Arial", color: GREEN, align: "center" } },
      { text: "노쇼 3회 24점, 5회 40점, 회복 −1, abuse 최소 주의", options: { fontSize: 11, fontFace: "Arial", color: SLATE } },
    ],
    [
      { text: "Security Rules", options: { fontSize: 11, fontFace: "Arial", color: DARK } },
      { text: "10개", options: { fontSize: 12, fontFace: "Arial", color: DARK, align: "center" } },
      { text: "PASS", options: { fontSize: 12, bold: true, fontFace: "Arial", color: GREEN, align: "center" } },
      { text: "타 가게 차단, riskStats 위조, type enum 검증", options: { fontSize: 11, fontFace: "Arial", color: SLATE } },
    ],
    [
      { text: "search.ts", options: { fontSize: 11, fontFace: "Arial", color: DARK } },
      { text: "13개", options: { fontSize: 12, fontFace: "Arial", color: DARK, align: "center" } },
      { text: "PASS", options: { fontSize: 12, bold: true, fontFace: "Arial", color: GREEN, align: "center" } },
      { text: "TDD 기반 phoneLast4 / name 검색 엣지케이스", options: { fontSize: 11, fontFace: "Arial", color: SLATE } },
    ],
  ];
  slide.addTable(testRows, {
    x: 0.8, y: 5.7, w: 11.7,
    colW: [2.2, 1.2, 1.2, 7.1],
    border: { type: "solid", color: ICE, pt: 1 },
    valign: "middle",
    rowH: 0.4,
  });
}

// ═══════════════════════════════════════════════════
// Slide 14 — Retrospective & Next Steps
// ═══════════════════════════════════════════════════
{
  const slide = pres.addSlide({ masterName: "Content" });
  slide.addText("회고 & 다음 계획", {
    x: 0.6, y: 0.4, w: 12, h: 0.6,
    fontSize: 36, bold: true, color: NAVY, fontFace: "Arial",
  });

  // What went well
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 1.2, w: 5.5, h: 2.5,
    fill: { color: "F0FDF4" },
    line: { color: GREEN, width: 1.5 },
    rectRadius: 0.1,
  });
  slide.addText("잘 된 점", {
    x: 1.0, y: 1.3, w: 5, h: 0.35,
    fontSize: 18, bold: true, color: GREEN, fontFace: "Arial",
  });
  slide.addText([
    { text: "• 인터페이스 우선 전략으로 세션 간 대기 최소화\n", options: { fontSize: 12, color: DARK, fontFace: "Arial" } },
    { text: "• 4세션 병렬 개발로 3주 만에 MVP 완성 + 배포\n", options: { fontSize: 12, color: DARK, fontFace: "Arial" } },
    { text: "• TDD로 risk.ts 13개 테스트 → 위험도 로직 신뢰\n", options: { fontSize: 12, color: DARK, fontFace: "Arial" } },
    { text: "• 보안 회귀 10개 PASS → 가게 격리 검증 완료\n", options: { fontSize: 12, color: DARK, fontFace: "Arial" } },
    { text: "• Firebase Hosting 배포 → 실제 도메인 확보\n", options: { fontSize: 12, color: DARK, fontFace: "Arial" } },
  ], {
    x: 1.0, y: 1.7, w: 5, h: 1.9, paraSpaceAfter: 5, fontFace: "Arial",
  });

  // Challenges
  slide.addShape(pres.ShapeType.roundRect, {
    x: 7.0, y: 1.2, w: 5.5, h: 2.5,
    fill: { color: "FEF2F2" },
    line: { color: RED, width: 1.5 },
    rectRadius: 0.1,
  });
  slide.addText("어려웠던 점", {
    x: 7.2, y: 1.3, w: 5, h: 0.35,
    fontSize: 18, bold: true, color: RED, fontFace: "Arial",
  });
  slide.addText([
    { text: "• Claude 구독 만료 + Codex 정지 → 도구 이관 필연\n", options: { fontSize: 12, color: DARK, fontFace: "Arial" } },
    { text: "• Spark 요금제 → Cloud Functions 배포 불가\n", options: { fontSize: 12, color: DARK, fontFace: "Arial" } },
    { text: "  → riskRefresh.ts 클라이언트 갱신으로 대체\n", options: { fontSize: 11, color: SLATE, fontFace: "Arial" } },
    { text: "• 4세션 단일 브랜치 → 충돌 관리 부담\n", options: { fontSize: 12, color: DARK, fontFace: "Arial" } },
    { text: "• 모델별 지능 차이 → 역할 재배치 (보안 모델 변경)\n", options: { fontSize: 12, color: DARK, fontFace: "Arial" } },
    { text: "• 일정 2일 앞당김 (7/30 → 7/28 마감)\n", options: { fontSize: 12, color: DARK, fontFace: "Arial" } },
  ], {
    x: 7.2, y: 1.7, w: 5, h: 1.9, paraSpaceAfter: 5, fontFace: "Arial",
  });

  // Next steps
  slide.addText("7/28 이후 (Phase 1.5 ~ 3)", {
    x: 0.8, y: 4.0, w: 11.7, h: 0.4,
    fontSize: 18, bold: true, color: NAVY, fontFace: "Arial",
  });

  const phases = [
    { phase: "Phase 1.5", items: "월별 노쇼·사건 통계 차트 (Recharts)", color: BLUE },
    { phase: "Phase 2", items: "고객 본인 인증 조회 (/me) + 정정·삭제 요청·이의제기", color: AMBER },
    { phase: "Phase 3", items: "예약금 결제 (토스페이먼츠) + 외부 예약 플랫폼 연동", color: GREEN },
  ];
  phases.forEach((p, i) => {
    const y = 4.5 + i * 0.6;
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y: y, w: 2.0, h: 0.5,
      fill: { color: p.color },
      rectRadius: 0.06,
    });
    slide.addText(p.phase, {
      x: 0.8, y: y, w: 2.0, h: 0.5,
      fontSize: 13, bold: true, color: WHITE, align: "center", valign: "middle", fontFace: "Arial",
    });
    slide.addText(p.items, {
      x: 3.0, y: y, w: 9.5, h: 0.5,
      fontSize: 13, color: DARK, valign: "middle", fontFace: "Arial",
    });
  });

  // Timeline
  slide.addText("남은 일정: 13일차(7/27 월) 발표 자료 완성 · 14일차(7/28 화) 최종 마무리", {
    x: 0.8, y: 6.5, w: 11.7, h: 0.4,
    fontSize: 14, bold: true, color: NAVY, fontFace: "Arial",
  });
}

// ═══════════════════════════════════════════════════
// Slide 15 — Closing (dark)
// ═══════════════════════════════════════════════════
{
  const slide = pres.addSlide({ masterName: "Section" });
  slide.addText("감사합니다", {
    x: 0.8, y: 2.5, w: 11, h: 1.2,
    fontSize: 48, bold: true, color: WHITE, fontFace: "Arial",
  });
  slide.addText("질문 받겠습니다", {
    x: 0.8, y: 3.7, w: 11, h: 0.6,
    fontSize: 22, color: ICE, fontFace: "Arial",
  });
  slide.addText([
    { text: "ShowUp — 소상공인을 위한 노쇼·악성 고객 이력 관리 및 위험도 경고\n", options: { fontSize: 14, color: ICE, fontFace: "Arial" } },
    { text: "https://showup-project.web.app", options: { fontSize: 14, color: WHITE, bold: true, fontFace: "Arial" } },
    { text: "\nN167 채민석 · Hermes Agent 프레임워크 + Ollama Pro 모델", options: { fontSize: 12, color: ICE, fontFace: "Arial" } },
  ], {
    x: 0.8, y: 5.0, w: 11, h: 1.5, fontFace: "Arial",
  });
}

// ── Write file ──
const outPath = path.join(__dirname, "showup-week3-deck.pptx");
pres.writeFile({ fileName: outPath }).then(() => {
  console.log("Generated:", outPath);
}).catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});