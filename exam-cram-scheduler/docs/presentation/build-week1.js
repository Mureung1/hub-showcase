const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const {
  FaExclamationCircle, FaCheckCircle, FaPalette, FaFolderOpen,
  FaExternalLinkAlt, FaBrain, FaChartLine, FaQuestionCircle, FaMugHot,
  FaBed, FaReact, FaServer, FaDatabase, FaThLarge, FaCalculator,
  FaTrophy, FaFingerprint,
} = require("react-icons/fa");

// 디자인.md 토큰 그대로 사용
const COLOR = {
  surface: "FFFFFF",
  surfaceMuted: "F6F1E9",
  ink900: "201409",
  ink600: "786A5C",
  ink400: "AB9D8C",
  line: "ECE3D5",
  brand: "9A5B28",
  brandStrong: "7A4720",
  brandSoft: "F1E0C9",
  tagSleep: "43290F",
  tagStudy: "B98A55",
  tagCaffeine: "D99A3D",
  dangerBg: "FBEAE5",
  dangerText: "9A3324",
  dangerIcon: "C1442C",
};
const FONT = "Noto Sans KR";

// 슬라이드 프레임: LAYOUT_16x9 = 10 x 5.625in. 모든 요소는 이 안에 들어와야 한다.
// 상단 여백(TOP_MARGIN, 이어브로우 시작 y)만큼은 하단에도 최소한 남겨야 위아래 여백이 균형있어 보인다.
const SLIDE_W = 10, SLIDE_H = 5.625, TOP_MARGIN = 0.28;
const SAFE_BOTTOM = SLIDE_H - TOP_MARGIN;

function addContentFrame(pres, slide, title, eyebrow) {
  slide.background = { color: COLOR.surface };
  if (eyebrow) {
    slide.addText(eyebrow, {
      x: 0.5, y: 0.28, w: 9, h: 0.3,
      fontSize: 12, bold: true, color: COLOR.brand,
      align: "left", fontFace: FONT, margin: 0, charSpacing: 1,
    });
  }
  slide.addText(title, {
    x: 0.5, y: eyebrow ? 0.55 : 0.4, w: 9, h: 0.55,
    fontSize: 25, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: eyebrow ? 1.16 : 1.02, w: 0.5, h: 0.045,
    fill: { color: COLOR.brand }, line: { type: "none" },
  });
}

function renderIconSvg(IconComponent, color, size = 256) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color, size: String(size) })
  );
}
async function iconToBase64Png(IconComponent, color, size = 256) {
  const svg = renderIconSvg(IconComponent, color, size);
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + pngBuffer.toString("base64");
}
async function svgToBase64Png(svgString, width, height) {
  const pngBuffer = await sharp(Buffer.from(svgString), { density: 300 })
    .resize(width, height)
    .png()
    .toBuffer();
  return "image/png;base64," + pngBuffer.toString("base64");
}

// 원형 아이콘 배지. cx/cy는 배지의 "중심" — 옆에 나란히 두는 텍스트도 반드시 같은 cy를 기준으로 valign:"middle" 배치할 것
function iconBadge(pres, slide, cx, cy, d, imgData, imgScale, bg) {
  slide.addShape(pres.shapes.OVAL, { x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: bg } });
  const iw = d * imgScale;
  slide.addImage({ data: imgData, x: cx - iw / 2, y: cy - iw / 2, w: iw, h: iw });
}

// 긴 문장은 자동 줄바꿈에 맡기지 않고, 이 배열의 줄 단위로 직접 끊는다 (CLAUDE.md 발표자료 컨벤션)
function multiLine(lines, opts = {}) {
  return lines.map((line, idx) => ({
    text: line,
    options: idx < lines.length - 1 ? { breakLine: true, ...opts } : { ...opts },
  }));
}

function arrowBetween(pres, slide, x, yMid, w, color) {
  slide.addShape(pres.shapes.LINE, {
    x, y: yMid, w, h: 0,
    line: { color, width: 1.5, endArrowType: "triangle" },
  });
}

async function build() {
  let pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "N110_안정연";
  pres.title = "시험 벼락치기 스케줄러 — 1주차 진행 공유";

  const icons = {
    exclaim: await iconToBase64Png(FaExclamationCircle, "#" + COLOR.brand, 300),
    check: await iconToBase64Png(FaCheckCircle, "#" + COLOR.brand, 300),
    palette: await iconToBase64Png(FaPalette, "#" + COLOR.brand, 300),
    folder: await iconToBase64Png(FaFolderOpen, "#" + COLOR.brand, 300),
    link: await iconToBase64Png(FaExternalLinkAlt, "#FFFFFF", 300),
    brain: await iconToBase64Png(FaBrain, "#" + COLOR.brand, 300),
    chart: await iconToBase64Png(FaChartLine, "#" + COLOR.brand, 300),
    question: await iconToBase64Png(FaQuestionCircle, "#" + COLOR.brand, 300),
    mug: await iconToBase64Png(FaMugHot, "#" + COLOR.tagCaffeine, 300),
    bed: await iconToBase64Png(FaBed, "#" + COLOR.tagSleep, 300),
    react: await iconToBase64Png(FaReact, "#" + COLOR.brand, 300),
    server: await iconToBase64Png(FaServer, "#" + COLOR.brand, 300),
    database: await iconToBase64Png(FaDatabase, "#" + COLOR.brand, 300),
    grid: await iconToBase64Png(FaThLarge, "#" + COLOR.brand, 300),
    calc: await iconToBase64Png(FaCalculator, "#" + COLOR.brand, 300),
    trophy: await iconToBase64Png(FaTrophy, "#" + COLOR.brand, 300),
    fingerprint: await iconToBase64Png(FaFingerprint, "#" + COLOR.brand, 300),
  };

  // ── Slide 1 — 표지 ──────────────────────────────────────
  let s1 = pres.addSlide();
  s1.background = { color: COLOR.surface };

  s1.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 0.55, w: 2.55, h: 0.42,
    fill: { color: COLOR.brandSoft }, rectRadius: 0.08,
  });
  s1.addText("1주차 진행 공유", {
    x: 0.5, y: 0.55, w: 2.55, h: 0.42,
    fontSize: 13, bold: true, color: COLOR.brandStrong,
    align: "center", valign: "middle", fontFace: FONT, margin: 0,
  });

  s1.addText("시험 벼락치기 스케줄러", {
    x: 0.5, y: 2.1, w: 9, h: 0.85,
    fontSize: 38, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  s1.addText("시험기간 대학생을 위한 수면·카페인 스케줄 최적화 도구", {
    x: 0.5, y: 2.95, w: 8.5, h: 0.5,
    fontSize: 15, color: COLOR.ink600,
    align: "left", fontFace: FONT, margin: 0,
  });

  s1.addShape(pres.shapes.LINE, {
    x: 0.5, y: 4.5, w: 1.2, h: 0,
    line: { color: COLOR.line, width: 1.5 },
  });
  s1.addText("N110_안정연", {
    x: 0.5, y: 4.65, w: 4, h: 0.4,
    fontSize: 14, bold: true, color: COLOR.ink600,
    align: "left", fontFace: FONT, margin: 0,
  });

  // ── Slide 2 — 문제 상황 ─────────────────────────────────
  let s2 = pres.addSlide();
  addContentFrame(pres, s2, "왜 이 프로젝트를 시작했나", "문제 정의");

  s2.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 1.35, w: 4.3, h: 3.45,
    fill: { color: COLOR.surfaceMuted }, rectRadius: 0.09,
  });
  const situHeadCy = 1.75;
  iconBadge(pres, s2, 1.05, situHeadCy, 0.5, icons.exclaim, 0.55, COLOR.brandSoft);
  s2.addText("상황", {
    x: 1.42, y: situHeadCy - 0.2, w: 3, h: 0.4,
    fontSize: 15, bold: true, color: COLOR.ink900,
    align: "left", valign: "middle", fontFace: FONT, margin: 0,
  });
  s2.addText(
    multiLine([
      "시험기간이 되면 대학생 대부분은 벼락치기를 하고,",
      "수면·카페인 섭취를 순전히 감과 스트레스에 의존해 조절한다.",
    ]),
    {
      x: 0.75, y: 2.25, w: 3.8, h: 0.75,
      fontSize: 11.5, color: COLOR.ink900,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.3,
    }
  );
  s2.addText("나의 경험", {
    x: 0.75, y: 3.05, w: 3, h: 0.3,
    fontSize: 11.5, bold: true, color: COLOR.brandStrong,
    align: "left", fontFace: FONT, margin: 0,
  });
  s2.addText(
    multiLine([
      "스트레스로 매운 음식·결식 반복",
      "→ 카페인 과다 섭취 → 수면 부족 → 위염",
      "정작 시험 당일엔 컨디션 저하로 죽만 먹는 경험",
    ]),
    {
      x: 0.75, y: 3.38, w: 3.8, h: 1.15,
      fontSize: 11, color: COLOR.ink600,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.3,
    }
  );

  const problems = [
    ["언제 자고, 언제 일어나고, 카페인을 얼마나 마셔야 할지", "과학적 근거 없이 직관에만 의존"],
    ["그 결과 수면 부족 누적·위장 장애·시험 당일", "컨디션 저하라는 역효과 발생"],
    ["시험이 하루가 아니라 일주일 내내 겹치는데,", "\"오늘 밤\"만 생각하고 시험 기간 전체 배분은 못 함"],
    ["일부 학생의 특수 상황이 아니라,", "시험 있는 대학생이라면 학기마다 겪는 보편적 문제"],
  ];
  s2.addText("핵심 문제", {
    x: 5.05, y: 1.35, w: 4.45, h: 0.35,
    fontSize: 15, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  problems.forEach((lines, i) => {
    const py = 1.9 + i * 0.72;
    const numCy = py + 0.15;
    s2.addShape(pres.shapes.OVAL, {
      x: 5.05, y: numCy - 0.13, w: 0.26, h: 0.26,
      fill: { color: COLOR.brand },
    });
    s2.addText(String(i + 1), {
      x: 5.05, y: numCy - 0.13, w: 0.26, h: 0.26,
      fontSize: 10.5, bold: true, color: COLOR.surface,
      align: "center", valign: "middle", fontFace: FONT, margin: 0,
    });
    s2.addText(multiLine(lines), {
      x: 5.42, y: py - 0.08, w: 4.08, h: 0.62,
      fontSize: 10.5, color: COLOR.ink900,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.25,
    });
  });

  s2.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 4.9, w: 9, h: 0.4,
    fill: { color: COLOR.brandSoft }, rectRadius: 0.08,
  });
  s2.addText("시험 여러 개가 겹치는 \"시험 주간\" 전체를 놓고 컨디션을 배분해주는 기능", {
    x: 0.7, y: 4.9, w: 8.6, h: 0.4,
    fontSize: 11.5, bold: true, color: COLOR.brandStrong,
    align: "center", valign: "middle", fontFace: FONT, margin: 0,
  });

  // ── Slide 3 — 프로젝트 로드맵 ───────────────────────────
  let s3 = pres.addSlide();
  addContentFrame(pres, s3, "프로젝트 로드맵 (4주)", "로드맵");

  const roadmap = [
    {
      w: "1주차", status: "진행 중", active: true,
      items: ["아이디어 검증 및 문제 정의", "기획서 작성 (v1 → v2)", "디자인 문서·스킬 설정", "프로토타입 제작 → React 이식"],
    },
    {
      w: "2주차", status: "다음 순서", active: false,
      items: ["졸음·각성 리듬 계산 공식 구현", "카페인 효과 계산 방식 만들기", "카페인 안전량 체크 기능", "시험 여러 개 한번에 고려하기"],
    },
    {
      w: "3주차", status: "예정", active: false,
      items: ["화면에 계산 기능 실제 연결", "그래프로 결과 보여주기", "서버 · DB 데이터 연동"],
    },
    {
      w: "4주차", status: "예정", active: false,
      items: ["추가 기능 (여유 시)", "전체 테스트 · 버그 수정", "발표 자료 · 데모 준비"],
    },
  ];
  const rW = 2.1, rGap = 0.25, rY = 1.4, rH = 2.85;
  roadmap.forEach((r, i) => {
    const rx = 0.5 + i * (rW + rGap);
    s3.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: rx, y: rY, w: rW, h: rH,
      fill: { color: r.active ? COLOR.brandSoft : COLOR.surfaceMuted },
      line: r.active ? { color: COLOR.brand, width: 1.5 } : { color: COLOR.line, width: 1 },
      rectRadius: 0.09,
    });
    s3.addText(r.w, {
      x: rx + 0.15, y: rY + 0.14, w: rW - 0.3, h: 0.34,
      fontSize: 15, bold: true, color: r.active ? COLOR.brandStrong : COLOR.ink600,
      align: "left", fontFace: FONT, margin: 0,
    });
    const itemRowH = 0.42, dotD = 0.06;
    r.items.forEach((it, j) => {
      const iy = rY + 0.58 + j * itemRowH;
      s3.addShape(pres.shapes.OVAL, {
        x: rx + 0.16, y: iy + itemRowH / 2 - dotD / 2, w: dotD, h: dotD,
        fill: { color: r.active ? COLOR.brand : COLOR.ink400 },
      });
      s3.addText(it, {
        x: rx + 0.3, y: iy, w: rW - 0.45, h: itemRowH,
        fontSize: 8.7, color: COLOR.ink900,
        align: "left", valign: "middle", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.05,
      });
    });
    s3.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: rx + 0.15, y: rY + rH - 0.42, w: rW - 0.3, h: 0.3,
      fill: { color: r.active ? COLOR.brand : COLOR.surface }, rectRadius: 0.2,
      line: r.active ? { type: "none" } : { color: COLOR.line, width: 1 },
    });
    s3.addText(r.status, {
      x: rx + 0.15, y: rY + rH - 0.42, w: rW - 0.3, h: 0.3,
      fontSize: 9, bold: true, color: r.active ? COLOR.surface : COLOR.ink400,
      align: "center", valign: "middle", fontFace: FONT, margin: 0,
    });
    if (i < roadmap.length - 1) {
      arrowBetween(pres, s3, rx + rW, rY + rH / 2, rGap, COLOR.ink400);
    }
  });
  s3.addText("설계 과정: 아이디어 검증 → 전공 지식(수면과학 논문) 기반 설계 → 시나리오·기획서 완성 → 4주 개발", {
    x: 0.5, y: rY + rH + 0.18, w: 9, h: 0.32,
    fontSize: 10.5, italic: true, color: COLOR.ink600,
    align: "center", fontFace: FONT, margin: 0,
  });

  // ── Slide 4 — 이번 주 진행 상황 ─────────────────────────
  let s4 = pres.addSlide();
  addContentFrame(pres, s4, "이번 주 진행 상황 (7/6 ~ 7/9)", "1주차 · 진행 상황");

  const days = [
    { d: "7/6 (월)", items: ["React 개발 환경 설정", "프로토타입 인터페이스 레이아웃 디자인 착수"] },
    { d: "7/7 (화)", items: ["exam-cram-scheduler 와이어프레임 프로토타입 제작", "기획서 초안 작성"] },
    { d: "7/8 (수)", items: ["기획서(v2) 완성", "HTML/CSS 프로토타입 5개 화면 완성 (prototype_v1)", "GitHub Pages 자동 배포 워크플로 연결"] },
    { d: "7/9 (목)", items: ["서비스 기술 지도 · CLAUDE.md · 디자인 문서 정리", "프로토타입 5개 화면을 React 앱으로 이식"] },
  ];
  const dItemH = 0.27, dPad = 0.14, dGap = 0.09;
  let dCursorY = 1.38;
  days.forEach((day) => {
    const dH = dPad * 2 + day.items.length * dItemH;
    const dy = dCursorY;
    s4.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.5, y: dy, w: 1.35, h: dH,
      fill: { color: COLOR.brand }, rectRadius: 0.08,
    });
    s4.addText(day.d, {
      x: 0.5, y: dy, w: 1.35, h: dH,
      fontSize: 12, bold: true, color: COLOR.surface,
      align: "center", valign: "middle", fontFace: FONT, margin: 0,
    });
    s4.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 2.0, y: dy, w: 7.5, h: dH,
      fill: { color: COLOR.surfaceMuted }, rectRadius: 0.08,
    });
    day.items.forEach((it, j) => {
      const iy = dy + dPad + j * dItemH;
      s4.addShape(pres.shapes.OVAL, { x: 2.25, y: iy + 0.065, w: 0.08, h: 0.08, fill: { color: COLOR.brand } });
      s4.addText(it, {
        x: 2.45, y: iy - 0.02, w: 6.9, h: dItemH,
        fontSize: 10.5, color: COLOR.ink900,
        align: "left", valign: "middle", fontFace: FONT, margin: 0,
      });
    });
    dCursorY += dH + dGap;
  });

  // ── Slide 5 — 서비스 기술 지도 (FE/BE/DB) ────────────────
  let s5 = pres.addSlide();
  addContentFrame(pres, s5, "서비스 기술 지도", "기술 스택");

  const stack = [
    {
      icon: icons.react, name: "FE — React",
      lines: ["입력 폼·캘린더 UI, 각성도 그래프·타임라인 시각화,", "계산 결과는 브라우저 localStorage에 저장"],
    },
    {
      icon: icons.server, name: "BE — Express",
      lines: ["입력값을 Two-Process + UMP 모델로 계산하는 API,", "음료별 카페인 함량 등 참고 데이터 제공 API"],
    },
    {
      icon: icons.database, name: "DB — Supabase (Postgres)",
      lines: ["카페인 함량표·반감기·안전 섭취 한도 등", "참고용 정적 데이터를 저장"],
    },
  ];
  const stW = 2.87, stGap = 0.2, stY = 1.35, stH = 1.55;
  stack.forEach((s, i) => {
    const sx = 0.5 + i * (stW + stGap);
    s5.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: sx, y: stY, w: stW, h: stH,
      fill: { color: COLOR.surfaceMuted }, rectRadius: 0.1,
    });
    iconBadge(pres, s5, sx + 0.45, stY + 0.4, 0.5, s.icon, 0.55, COLOR.surface);
    s5.addText(s.name, {
      x: sx + 0.8, y: stY + 0.18, w: stW - 0.95, h: 0.44,
      fontSize: 11.5, bold: true, color: COLOR.ink900,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
    s5.addText(multiLine(s.lines), {
      x: sx + 0.18, y: stY + 0.78, w: stW - 0.36, h: 0.7,
      fontSize: 8.7, color: COLOR.ink600,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.2,
    });
  });

  s5.addText("핵심 기능 하나 — 계산하기 요청 흐름", {
    x: 0.5, y: stY + stH + 0.28, w: 9, h: 0.32,
    fontSize: 12.5, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });

  const flowSteps = [
    "정보 입력 화면\n\"계산하기\" 클릭",
    "POST\n/api/schedule/calculate",
    "Two-Process+UMP\n모델 계산",
    "DB 참고 데이터\n조회 (SELECT)",
    "결과 화면\n렌더링",
  ];
  const fsW = 1.62, fsGap = 0.15, fsY = stY + stH + 0.68, fsH = 0.85;
  const fsStartX = 0.5 + (9 - (fsW * 5 + fsGap * 4)) / 2;
  flowSteps.forEach((label, i) => {
    const fx = fsStartX + i * (fsW + fsGap);
    s5.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: fx, y: fsY, w: fsW, h: fsH,
      fill: { color: COLOR.brandSoft }, rectRadius: 0.08,
    });
    s5.addText(multiLine(label.split("\n")), {
      x: fx + 0.08, y: fsY, w: fsW - 0.16, h: fsH,
      fontSize: 8.7, bold: true, color: COLOR.brandStrong,
      align: "center", valign: "middle", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.15,
    });
    if (i < flowSteps.length - 1) {
      arrowBetween(pres, s5, fx + fsW, fsY + fsH / 2, fsGap, COLOR.brand);
    }
  });

  // ── Slide 6 — 디자인 설명 ───────────────────────────────
  let s6 = pres.addSlide();
  addContentFrame(pres, s6, "디자인 — 컬러 & 타이포그래피", "디자인 시스템");

  s6.addText("컬러 팔레트", {
    x: 0.5, y: 1.35, w: 4.3, h: 0.32,
    fontSize: 13, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  const swatches = [
    { name: "brand", hex: COLOR.brand, use: "주요 버튼 · 강조" },
    { name: "brand-strong", hex: COLOR.brandStrong, use: "진한 강조 텍스트" },
    { name: "brand-soft", hex: COLOR.brandSoft, use: "연한 배경 · 아이콘 배경" },
    { name: "ink-900", hex: COLOR.ink900, use: "기본 텍스트" },
    { name: "ink-600", hex: COLOR.ink600, use: "보조 텍스트" },
    { name: "surface-muted", hex: COLOR.surfaceMuted, use: "카드 배경" },
    { name: "tag-sleep", hex: COLOR.tagSleep, use: "수면 아이콘/범례" },
    { name: "tag-study", hex: COLOR.tagStudy, use: "공부 아이콘/범례" },
    { name: "tag-caffeine", hex: COLOR.tagCaffeine, use: "카페인 아이콘/범례" },
  ];
  swatches.forEach((sw, i) => {
    const sy = 1.78 + i * 0.4;
    s6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.5, y: sy, w: 0.36, h: 0.32,
      fill: { color: sw.hex }, rectRadius: 0.06,
      line: { color: COLOR.line, width: 0.75 },
    });
    s6.addText(sw.name, {
      x: 0.98, y: sy, w: 1.35, h: 0.32,
      fontSize: 10, bold: true, color: COLOR.ink900,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
    s6.addText("#" + sw.hex, {
      x: 2.3, y: sy, w: 0.95, h: 0.32,
      fontSize: 9, color: COLOR.ink400,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
    s6.addText(sw.use, {
      x: 3.2, y: sy, w: 1.6, h: 0.32,
      fontSize: 9, color: COLOR.ink600,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
  });

  s6.addText("타이포그래피 (Pretendard / Noto Sans KR)", {
    x: 5.1, y: 1.35, w: 4.4, h: 0.32,
    fontSize: 13, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  const typo = [
    { cls: "display-num", spec: "28px / 800", ex: "\"D-2 · 생화학\"" },
    { cls: "headline", spec: "19px / 800", ex: "\"상황을 알려주세요\"" },
    { cls: "section-head", spec: "15px / 700", ex: "\"시험 일정\"" },
    { cls: "row-title / row-sub", spec: "14.5px·12.5px", ex: "\"세포생물학\" / \"월 09:00\"" },
    { cls: "btn", spec: "14.5px / 700", ex: "\"계산하기\"" },
  ];
  typo.forEach((t, i) => {
    const ty = 1.78 + i * 0.5;
    s6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 5.1, y: ty, w: 4.4, h: 0.42,
      fill: { color: COLOR.surfaceMuted }, rectRadius: 0.06,
    });
    s6.addText(t.cls, {
      x: 5.25, y: ty, w: 1.55, h: 0.42,
      fontSize: 10, bold: true, color: COLOR.brandStrong,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
    s6.addText(t.spec, {
      x: 6.8, y: ty, w: 1.05, h: 0.42,
      fontSize: 9, color: COLOR.ink600,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
    s6.addText(t.ex, {
      x: 7.85, y: ty, w: 1.6, h: 0.42,
      fontSize: 8.5, color: COLOR.ink400,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
  });

  s6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.1, y: 4.35, w: 4.4, h: 0.85,
    fill: { color: COLOR.brandSoft }, rectRadius: 0.09,
  });
  s6.addText(
    multiLine(["여백 · 모서리 규칙", "카드/차트 22px · 입력박스 16px · 필드 10px 라운드, 화면 좌우 24px 여백"], {}),
    {
      x: 5.3, y: 4.35, w: 4.0, h: 0.85,
      fontSize: 10, color: COLOR.brandStrong,
      align: "left", valign: "middle", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.25,
    }
  );

  // ── Slide 6.5 — 디자인 변화 Before/After ──────────────────
  let sBA = pres.addSlide();
  addContentFrame(pres, sBA, "디자인 변화 — Before / After", "디자인 시스템");

  const baH = 3.15;
  const beforeRatio = 460 / 700, afterRatio = 390 / 844;
  const beforeW = baH * beforeRatio, afterW = baH * afterRatio;
  const baGap = 0.8;
  const baTotalW = beforeW + baGap + afterW;
  const baStartX = 0.5 + (9 - baTotalW) / 2;
  const baImgY = 1.7;

  sBA.addText("Before · 초기 와이어프레임 (docs/screens/)", {
    x: baStartX - 0.4, y: 1.35, w: beforeW + 0.8, h: 0.3,
    fontSize: 10.5, bold: true, color: COLOR.ink600,
    align: "center", fontFace: FONT, margin: 0,
  });
  sBA.addImage({ path: "../screens/home-screen.png", x: baStartX, y: baImgY, w: beforeW, h: baH });

  arrowBetween(pres, sBA, baStartX + beforeW + 0.08, baImgY + baH / 2, baGap - 0.16, COLOR.brand);

  const afterX = baStartX + beforeW + baGap;
  sBA.addText("After · 현재 client/ 프로토타입 (실제 렌더링)", {
    x: afterX - 0.4, y: 1.35, w: afterW + 0.8, h: 0.3,
    fontSize: 10.5, bold: true, color: COLOR.brandStrong,
    align: "center", fontFace: FONT, margin: 0,
  });
  sBA.addImage({ path: "assets/after-home.png", x: afterX, y: baImgY, w: afterW, h: baH });

  sBA.addText(
    [
      { text: "무엇이 바뀌었나: ", options: { bold: true } },
      { text: "회색 점선 placeholder → 브랜드 컬러(#9A5B28) 적용, 실제 아이콘·카드·둥근 모서리 컴포넌트로 구현", options: {} },
    ],
    {
      x: 0.5, y: baImgY + baH + 0.15, w: 9, h: 0.3,
      fontSize: 10.5, color: COLOR.ink600,
      align: "center", fontFace: FONT, margin: 0,
    }
  );

  // ── Slide 7 — 컴포넌트 / 폴더 구성 ──────────────────────
  let s7 = pres.addSlide();
  addContentFrame(pres, s7, "React 컴포넌트 & 폴더 구성", "프론트엔드 구조");

  s7.addText("구현된 컴포넌트 — client/src/components", {
    x: 0.5, y: 1.35, w: 4.3, h: 0.32,
    fontSize: 12.5, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  s7.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 1.72, w: 4.3, h: 3.5,
    fill: { color: COLOR.surfaceMuted }, rectRadius: 0.09,
  });
  const currentTree = [
    "client/src/components/",
    "├─ Card/       (Card.tsx + .module.css)",
    "├─ Row/",
    "├─ Segmented/",
    "├─ Switch/",
    "├─ Slider/",
    "├─ Button/",
    "├─ Field/",
    "├─ WarningBanner/",
    "├─ BottomSheet/",
    "├─ icons.tsx",
    "└─ index.ts   (모아서 export)",
  ];
  s7.addText(currentTree.join("\n"), {
    x: 0.75, y: 1.9, w: 3.8, h: 2.4,
    fontSize: 9.8, fontFace: "Consolas", color: COLOR.ink900,
    align: "left", valign: "top", margin: 0, lineSpacingMultiple: 1.2,
  });
  s7.addText(
    multiLine(["9개 컴포넌트 모두 PascalCase.tsx +", "동일 이름 .module.css 짝으로 이미 구성됨"]),
    {
      x: 0.75, y: 4.35, w: 3.8, h: 0.65,
      fontSize: 9.5, italic: true, color: COLOR.ink600,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.2,
    }
  );

  s7.addText("페이지 & 레이아웃 — client/src", {
    x: 5.1, y: 1.35, w: 4.4, h: 0.32,
    fontSize: 12.5, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  s7.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.1, y: 1.72, w: 4.4, h: 3.5,
    fill: { color: COLOR.brandSoft }, rectRadius: 0.09,
  });
  const pageStructure = [
    "pages/ (Home·Input·Processing·Result·Adjust)",
    "layouts/AppShell — 공통 화면 뼈대",
    "styles/tokens.css — 디자인 토큰",
    "react-router-dom으로 페이지 라우팅 연결",
  ];
  pageStructure.forEach((c, i) => {
    const cy = 1.95 + i * 0.62;
    s7.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 5.35, y: cy, w: 3.9, h: 0.5,
      fill: { color: COLOR.surface }, rectRadius: 0.07,
    });
    s7.addText(c, {
      x: 5.55, y: cy, w: 3.55, h: 0.5,
      fontSize: 10, color: COLOR.ink900,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
  });
  s7.addText(
    multiLine(["5개 페이지가 실제로 라우팅까지 연결된", "동작하는 앱 (react-router-dom)"]),
    {
      x: 5.35, y: 4.42, w: 3.9, h: 0.65,
      fontSize: 9.5, italic: true, color: COLOR.brandStrong,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.2,
    }
  );

  // ── Slide 8 — 프로토타입 소개 ───────────────────────────
  let s8 = pres.addSlide();
  s8.background = { color: COLOR.surface };
  s8.addText("프로토타입 소개", {
    x: 0.5, y: 0.5, w: 9, h: 0.6,
    fontSize: 25, bold: true, color: COLOR.ink900,
    align: "center", fontFace: FONT, margin: 0,
  });
  s8.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 1.5, y: 1.25, w: 7, h: 3.35,
    fill: { color: COLOR.brandSoft }, rectRadius: 0.12,
  });
  iconBadge(pres, s8, 5, 1.9, 0.75, icons.link, 0.5, COLOR.brand);
  s8.addText("홈 → 정보 입력 → 처리 중 → 결과 → 스케줄 조정, 5개 화면을 직접 눌러볼 수 있는 목업", {
    x: 1.9, y: 2.4, w: 6.2, h: 0.4,
    fontSize: 12, color: COLOR.brandStrong,
    align: "center", fontFace: FONT, margin: 0,
  });

  s8.addText("배포된 프로토타입", {
    x: 1.9, y: 2.9, w: 6.2, h: 0.26,
    fontSize: 10, bold: true, color: COLOR.ink600,
    align: "center", fontFace: FONT, margin: 0,
  });
  s8.addText("https://dodeho.github.io/hub/", {
    x: 1.9, y: 3.16, w: 6.2, h: 0.36,
    fontSize: 14.5, bold: true, color: COLOR.brand,
    align: "center", fontFace: FONT, margin: 0,
  });

  s8.addText("로컬 개발 서버", {
    x: 1.9, y: 3.64, w: 6.2, h: 0.26,
    fontSize: 10, bold: true, color: COLOR.ink600,
    align: "center", fontFace: FONT, margin: 0,
  });
  s8.addText("http://localhost:5173/", {
    x: 1.9, y: 3.9, w: 6.2, h: 0.36,
    fontSize: 14.5, bold: true, color: COLOR.brand,
    align: "center", fontFace: FONT, margin: 0,
  });

  // ── Slide 9 — 계산 모델 개념 ─────────────────────────────
  let s9 = pres.addSlide();
  addContentFrame(pres, s9, "어떻게 계산할까 — 모델 개념", "계산 엔진");

  const concepts = [
    { icon: icons.bed, title: "졸음은 쌓인다 (Process S)", body: "깨어있는 시간이 길수록 졸음(수면압)이 쌓이고, 자는 동안 풀린다" },
    { icon: icons.chart, title: "생체시계가 있다 (Process C)", body: "하루 주기로 오르내리는 원래 정해진 각성 리듬이 따로 있다" },
    { icon: icons.mug, title: "카페인이 일시적으로 억제한다 (UMP)", body: "카페인이 졸음 신호를 일시적으로 눌러줘서, 원하는 시각에 각성도를 끌어올릴 수 있다" },
  ];
  const ccW = 2.87, ccGap = 0.2, ccY = 1.55, ccH = 2.15;
  concepts.forEach((c, i) => {
    const cx = 0.5 + i * (ccW + ccGap);
    s9.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: cx, y: ccY, w: ccW, h: ccH,
      fill: { color: COLOR.surfaceMuted }, rectRadius: 0.1,
    });
    iconBadge(pres, s9, cx + ccW / 2, ccY + 0.55, 0.65, c.icon, 0.55, COLOR.surface);
    s9.addText(c.title, {
      x: cx + 0.15, y: ccY + 1.0, w: ccW - 0.3, h: 0.5,
      fontSize: 12, bold: true, color: COLOR.ink900,
      align: "center", valign: "top", fontFace: FONT, margin: 0,
    });
    s9.addText(c.body, {
      x: cx + 0.2, y: ccY + 1.48, w: ccW - 0.4, h: 0.6,
      fontSize: 9.5, color: COLOR.ink600,
      align: "center", valign: "top", fontFace: FONT, margin: 0,
    });
  });

  s9.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: ccY + ccH + 0.25, w: 9, h: 0.75,
    fill: { color: COLOR.brandSoft }, rectRadius: 0.09,
  });
  s9.addText(
    [
      { text: "결합하면: ", options: { bold: true } },
      { text: "졸음 + 생체리듬 + 카페인 효과를 합쳐서, \"언제 자고 언제 카페인을 마셔야 시험 시작 시각에 각성도가 최고가 되는지\"를 역산한다 (Borbély 1982 + Vital-Lopez 2024, UMP)", options: {} },
    ],
    {
      x: 0.75, y: ccY + ccH + 0.25, w: 8.5, h: 0.75,
      fontSize: 10.5, color: COLOR.brandStrong,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    }
  );
  s9.addText(
    [
      { text: "참고: Ramakrishnan et al. (2016), A Unified Model of Performance — ", options: {} },
      {
        text: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5020365/",
        options: { hyperlink: { url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5020365/" } },
      },
    ],
    {
      x: 0.5, y: ccY + ccH + 1.06, w: 9, h: 0.3,
      fontSize: 8.5, color: COLOR.ink400,
      align: "left", fontFace: FONT, margin: 0,
    }
  );

  // ── Slide 10 — 계산 과정 (그리드 → 시뮬레이션 → 채택) ────
  let s10 = pres.addSlide();
  addContentFrame(pres, s10, "어떻게 최적 스케줄을 찾을까 — 계산 과정 3단계", "계산 엔진");

  const steps = [
    {
      icon: icons.grid, title: "① 시간 그리드 만들기",
      lines: ["오늘부터 마지막 시험까지 30분 단위로 쪼개,", "깨어있기/잠자기 × 카페인 섭취/미섭취로 나눔"],
    },
    {
      icon: icons.calc, title: "② 후보마다 시뮬레이션",
      lines: ["각 조합을 모델에 대입해 각성도 곡선을 계산,", "시험 시각 각성도엔 가산점, 제약 위반엔 패널티"],
    },
    {
      icon: icons.trophy, title: "③ 최고점 스케줄 채택",
      lines: ["전수탐색이 아니라 후보를 반복 개선하는 국소 탐색,", "점수가 가장 높은 조합을 추천 스케줄로 제공"],
    },
  ];
  const stpW = 2.87, stpGap = 0.2, stpY = 1.35, stpH = 1.5;
  steps.forEach((st, i) => {
    const sx = 0.5 + i * (stpW + stpGap);
    s10.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: sx, y: stpY, w: stpW, h: stpH,
      fill: { color: COLOR.surfaceMuted }, rectRadius: 0.1,
    });
    iconBadge(pres, s10, sx + 0.42, stpY + 0.38, 0.46, st.icon, 0.55, COLOR.surface);
    s10.addText(st.title, {
      x: sx + 0.72, y: stpY + 0.15, w: stpW - 0.85, h: 0.46,
      fontSize: 10.8, bold: true, color: COLOR.ink900,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
    s10.addText(multiLine(st.lines), {
      x: sx + 0.18, y: stpY + 0.7, w: stpW - 0.36, h: 0.72,
      fontSize: 8.7, color: COLOR.ink600,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.2,
    });
    if (i < steps.length - 1) {
      arrowBetween(pres, s10, sx + stpW, stpY + stpH / 2, stpGap, COLOR.brand);
    }
  });

  s10.addText("예시: 이 과정을 거쳐 선택된 스케줄의 예측 각성도 곡선", {
    x: 0.5, y: stpY + stpH + 0.16, w: 9, h: 0.3,
    fontSize: 10.5, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });

  const graphCardY = stpY + stpH + 0.5;
  const graphCardH = SAFE_BOTTOM - graphCardY;
  s10.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: graphCardY, w: 9, h: graphCardH,
    fill: { color: COLOR.surfaceMuted }, rectRadius: 0.1,
  });

  const chartSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 320">
    <line x1="30" y1="280" x2="670" y2="280" stroke="#${COLOR.line}" stroke-width="2"/>
    <rect x="380" y="40" width="90" height="240" fill="#${COLOR.tagCaffeine}" opacity="0.16"/>
    <line x1="140" y1="40" x2="140" y2="280" stroke="#${COLOR.ink400}" stroke-width="1.5" stroke-dasharray="5 5"/>
    <line x1="300" y1="40" x2="300" y2="280" stroke="#${COLOR.ink400}" stroke-width="1.5" stroke-dasharray="5 5"/>
    <line x1="560" y1="40" x2="560" y2="280" stroke="#${COLOR.brandStrong}" stroke-width="1.5" stroke-dasharray="5 5"/>
    <path d="M30,190 L140,215" fill="none" stroke="#${COLOR.ink900}" stroke-width="4" stroke-linecap="round"/>
    <path d="M140,215 C180,260 260,260 300,150" fill="none" stroke="#${COLOR.ink400}" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="9 7"/>
    <path d="M300,150 C330,175 350,178 380,162 C420,120 480,90 560,58" fill="none" stroke="#${COLOR.brand}" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M560,58 C590,68 625,82 660,100" fill="none" stroke="#${COLOR.brand}" stroke-width="4.5" stroke-linecap="round" opacity="0.5"/>
    <circle cx="560" cy="58" r="8" fill="#${COLOR.brandStrong}"/>
  </svg>`;
  const chartImg = await svgToBase64Png(chartSvg, 1400, 640);
  const imgW = 3.05, imgH = imgW * (320 / 700);
  const imgX = 0.7, imgY = graphCardY + (graphCardH - imgH - 0.28) / 2;
  s10.addImage({ data: chartImg, x: imgX, y: imgY, w: imgW, h: imgH });

  const markers = [{ x: 140, label: "취침" }, { x: 300, label: "기상" }, { x: 560, label: "시험시작" }];
  markers.forEach((m) => {
    const mx = imgX + (m.x / 700) * imgW;
    s10.addText(m.label, {
      x: mx - 0.4, y: imgY + imgH + 0.02, w: 0.8, h: 0.22,
      fontSize: 7.3, bold: m.label === "시험시작", color: m.label === "시험시작" ? COLOR.brandStrong : COLOR.ink600,
      align: "center", fontFace: FONT, margin: 0,
    });
  });

  const legend = [
    { color: COLOR.ink900, label: "깨어있는 동안 예측 각성도" },
    { color: COLOR.ink400, label: "수면 중 구간 (모델상 회복)" },
    { color: COLOR.tagCaffeine, label: "카페인 부스트 구간" },
    { color: COLOR.brandStrong, label: "정점 = 시험 시작 시각" },
  ];
  const legX = imgX + imgW + 0.35;
  legend.forEach((l, i) => {
    const ly = graphCardY + 0.16 + i * ((graphCardH - 0.32) / legend.length);
    s10.addShape(pres.shapes.RECTANGLE, {
      x: legX, y: ly, w: 0.26, h: 0.09,
      fill: { color: l.color }, line: { type: "none" },
    });
    s10.addText(l.label, {
      x: legX + 0.35, y: ly - 0.11, w: 4.9, h: 0.32,
      fontSize: 9, color: COLOR.ink900,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
  });

  // ── Slide 11 — 가장 고민되는 것 ──────────────────────────
  let s11 = pres.addSlide();
  addContentFrame(pres, s11, "가장 고민되는 것", "다음 단계 · 고민");

  const worries = [
    {
      icon: icons.brain, title: "코드를 완전히 이해하고 있을까",
      lines: ["비전공자라 도메인 지식이 없다 보니,", "AI가 만들어준 코드를 결과물에 쫓겨", "그대로 쓰는 느낌 — 원리를 제대로", "이해하고 가는 게 맞을지 고민"],
    },
    {
      icon: icons.fingerprint, title: "개인화까지 구현할 수 있을까",
      lines: ["지금은 집단 평균 파라미터로 계산하는데,", "개인 데이터가 쌓이면 더 정확한 결과를", "낼 수 있을지, 4주 안에 어디까지", "손댈 수 있을지 감이 안 옴"],
    },
    {
      icon: icons.database, title: "DB를 어떻게 설계해야 할지 모르겠다",
      lines: ["FE(React)·BE(Express)는 정했는데,", "Supabase에 실제로 어떤 테이블·", "스키마를 둬야 할지 전혀 감이 안 옴"],
    },
  ];
  const wwW = 2.87, wwGap = 0.2, wwY = 1.5, wwH = 3.0;
  worries.forEach((w, i) => {
    const wx = 0.5 + i * (wwW + wwGap);
    s11.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: wx, y: wwY, w: wwW, h: wwH,
      fill: { color: COLOR.surfaceMuted }, rectRadius: 0.1,
    });
    iconBadge(pres, s11, wx + wwW / 2, wwY + 0.5, 0.6, w.icon, 0.55, COLOR.surface);
    s11.addText(w.title, {
      x: wx + 0.15, y: wwY + 0.9, w: wwW - 0.3, h: 0.55,
      fontSize: 11.5, bold: true, color: COLOR.ink900,
      align: "center", valign: "top", fontFace: FONT, margin: 0,
    });
    s11.addText(multiLine(w.lines), {
      x: wx + 0.2, y: wwY + 1.5, w: wwW - 0.4, h: 1.35,
      fontSize: 9.5, color: COLOR.ink600,
      align: "center", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.3,
    });
  });

  await pres.writeFile({ fileName: "1주차_진행공유.pptx" });
  console.log("done");
}

build();
