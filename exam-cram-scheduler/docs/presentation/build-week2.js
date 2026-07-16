const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const {
  FaCheckCircle, FaArrowRight, FaReact, FaServer, FaDatabase,
  FaBed, FaChartLine, FaWrench, FaMugHot, FaFlask, FaLayerGroup,
  FaShieldAlt, FaSearch, FaGithub, FaLightbulb, FaRoute,
} = require("react-icons/fa");

// 디자인.md 토큰 그대로 사용 (1주차 build-week1.js와 동일)
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
  successBg: "E8F0E3",
  successText: "3A6B2E",
};
const FONT = "Noto Sans KR";

// 슬라이드 프레임: LAYOUT_16x9 = 10 x 5.625in. 모든 요소는 이 안에 들어와야 한다.
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

// 코드 캡처 + "왜 이렇게 작성했나" 슬라이드 — 2주차 계산 엔진 8개 함수 공통 레이아웃.
// 왼쪽: 파일명·핵심 수식 + 코드 스크린샷을 붙여넣을 자리(점선 박스, 아직 빈 채로 둠)
// 오른쪽: 작성 근거·의사결정 설명(코드 주석·문서에 실제로 남아있는 내용 기반)
function codeSlide(pres, { eyebrow, title, icon, iconColor, fileNames, formulaLines, rationaleLines, sourceLine }) {
  const slide = pres.addSlide();
  addContentFrame(pres, slide, title, eyebrow);

  const leftX = 0.5, leftW = 4.3;
  const rightX = 5.1, rightW = 4.4;
  const topY = 1.35;

  iconBadge(pres, slide, leftX + 0.26, topY + 0.24, 0.48, icon, 0.55, COLOR.surfaceMuted);
  slide.addText(fileNames.join("  ·  "), {
    x: leftX + 0.58, y: topY, w: leftW - 0.58, h: 0.48,
    fontSize: 11, bold: true, fontFace: "Consolas", color: COLOR.ink900,
    align: "left", valign: "middle", margin: 0,
  });

  slide.addText(multiLine(formulaLines), {
    x: leftX, y: topY + 0.56, w: leftW, h: 0.7,
    fontSize: 9.3, fontFace: "Consolas", color: COLOR.brandStrong,
    align: "left", valign: "top", margin: 0, lineSpacingMultiple: 1.35,
  });

  const boxY = topY + 1.3;
  const boxH = SAFE_BOTTOM - boxY;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: leftX, y: boxY, w: leftW, h: boxH,
    fill: { color: COLOR.surfaceMuted },
    line: { color: COLOR.ink400, width: 1.25, dashType: "dash" },
    rectRadius: 0.08,
  });
  slide.addText(
    multiLine(["코드 스크린샷", "붙여넣기"]),
    {
      x: leftX, y: boxY, w: leftW, h: boxH,
      fontSize: 12, italic: true, color: COLOR.ink400,
      align: "center", valign: "middle", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.3,
    }
  );

  slide.addText("왜 이렇게 작성했나", {
    x: rightX, y: topY, w: rightW, h: 0.35,
    fontSize: 13, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });

  // 박스 높이를 고정하지 않고 줄 수에 맞춰 정확히 맞춘다 — 내용이 짧은 슬라이드에서
  // 베이지색 박스만 크고 글자는 위쪽에 몰려있는 현상을 막기 위함(2026-07-16 수정)
  const RATIONALE_LINE_H = 0.21;
  const rationaleBoxY = topY + 0.42;
  const rationaleBoxH = rationaleLines.length * RATIONALE_LINE_H + 0.34;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rightX, y: rationaleBoxY, w: rightW, h: rationaleBoxH,
    fill: { color: COLOR.brandSoft }, rectRadius: 0.09,
  });
  slide.addText(multiLine(rationaleLines), {
    x: rightX + 0.22, y: rationaleBoxY + 0.17, w: rightW - 0.44, h: rationaleBoxH - 0.34,
    fontSize: 10.3, color: COLOR.brandStrong,
    align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.35,
  });

  if (sourceLine) {
    slide.addText(sourceLine, {
      x: rightX, y: rationaleBoxY + rationaleBoxH + 0.16, w: rightW, h: 0.3,
      fontSize: 8.3, italic: true, color: COLOR.ink400,
      align: "left", fontFace: FONT, margin: 0,
    });
  }

  return slide;
}

async function build() {
  let pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "N110_안정연";
  pres.title = "시험 벼락치기 스케줄러 — 2주차 진행 공유";

  const icons = {
    check: await iconToBase64Png(FaCheckCircle, "#" + COLOR.brand, 300),
    arrow: await iconToBase64Png(FaArrowRight, "#" + COLOR.brand, 300),
    react: await iconToBase64Png(FaReact, "#" + COLOR.brand, 300),
    server: await iconToBase64Png(FaServer, "#" + COLOR.brand, 300),
    database: await iconToBase64Png(FaDatabase, "#" + COLOR.brand, 300),
    bed: await iconToBase64Png(FaBed, "#" + COLOR.tagSleep, 300),
    chart: await iconToBase64Png(FaChartLine, "#" + COLOR.brand, 300),
    wrench: await iconToBase64Png(FaWrench, "#" + COLOR.brand, 300),
    mug: await iconToBase64Png(FaMugHot, "#" + COLOR.tagCaffeine, 300),
    flask: await iconToBase64Png(FaFlask, "#" + COLOR.tagCaffeine, 300),
    layer: await iconToBase64Png(FaLayerGroup, "#" + COLOR.brand, 300),
    shield: await iconToBase64Png(FaShieldAlt, "#" + COLOR.brand, 300),
    search: await iconToBase64Png(FaSearch, "#" + COLOR.brand, 300),
    github: await iconToBase64Png(FaGithub, "#" + COLOR.ink900, 300),
    bulb: await iconToBase64Png(FaLightbulb, "#" + COLOR.brand, 300),
    route: await iconToBase64Png(FaRoute, "#" + COLOR.brand, 300),
  };

  // ── Slide 1 — 표지 ──────────────────────────────────────
  let s1 = pres.addSlide();
  s1.background = { color: COLOR.surface };

  s1.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 0.55, w: 2.55, h: 0.42,
    fill: { color: COLOR.brandSoft }, rectRadius: 0.08,
  });
  s1.addText("2주차 진행 공유", {
    x: 0.5, y: 0.55, w: 2.55, h: 0.42,
    fontSize: 13, bold: true, color: COLOR.brandStrong,
    align: "center", valign: "middle", fontFace: FONT, margin: 0,
  });

  s1.addText("시험 벼락치기 스케줄러", {
    x: 0.5, y: 2.1, w: 9, h: 0.85,
    fontSize: 38, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  s1.addText("시험기간 대학생을 위한 수면·카페인 스케줄 최적화 도구 — 계산 엔진 파트", {
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

  // ── Slide 2 — 프로젝트 소개 · 문제 정의 ──────────────────
  let s2 = pres.addSlide();
  addContentFrame(pres, s2, "무엇을, 왜 만드는가", "프로젝트 소개");

  s2.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 1.35, w: 4.3, h: 3.6,
    fill: { color: COLOR.surfaceMuted }, rectRadius: 0.09,
  });
  s2.addText("상황", {
    x: 0.75, y: 1.55, w: 3.8, h: 0.32,
    fontSize: 13, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  s2.addText(
    multiLine([
      "시험기간이 되면 대학생 대부분은 벼락치기를 하고,",
      "수면·카페인 섭취를 순전히 감에 의존해 조절한다.",
      "그 결과 수면 부족·컨디션 저하가 누적되고,",
      "시험이 여러 개 겹치는 주간 전체는 고려하지",
      "못한 채 \"오늘 밤\"만 생각하게 된다.",
    ]),
    {
      x: 0.75, y: 1.95, w: 3.8, h: 1.55,
      fontSize: 11, color: COLOR.ink900,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.35,
    }
  );
  s2.addText("만드는 것", {
    x: 0.75, y: 3.55, w: 3.8, h: 0.32,
    fontSize: 13, bold: true, color: COLOR.brandStrong,
    align: "left", fontFace: FONT, margin: 0,
  });
  s2.addText(
    multiLine([
      "시험 날짜·공부량·수면패턴·카페인 상태를 입력하면,",
      "검증된 생물수학 모델로 \"시험 시작 시각에 각성도가",
      "최고가 되는\" 수면·카페인 스케줄을 계산해주는 도구.",
    ]),
    {
      x: 0.75, y: 3.93, w: 3.8, h: 0.9,
      fontSize: 11, color: COLOR.brandStrong,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.35,
    }
  );

  s2.addText("핵심 기능", {
    x: 5.1, y: 1.35, w: 4.4, h: 0.32,
    fontSize: 13, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  s2.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.1, y: 1.75, w: 4.4, h: 1.35,
    fill: { color: COLOR.brandSoft }, rectRadius: 0.1,
  });
  s2.addText(
    multiLine([
      "하루 단위 스케줄이 아니라, 시험이 여러 개",
      "겹치는 \"시험기간 전체\"를 한 번에 고려해",
      "수면·카페인 스케줄을 배분해준다.",
    ]),
    {
      x: 5.35, y: 1.9, w: 3.9, h: 1.05,
      fontSize: 11, bold: true, color: COLOR.brandStrong,
      align: "left", valign: "middle", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.35,
    }
  );

  s2.addText("사용한 모델", {
    x: 5.1, y: 3.3, w: 4.4, h: 0.32,
    fontSize: 13, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  s2.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.1, y: 3.7, w: 4.4, h: 1.25,
    fill: { color: COLOR.surfaceMuted }, rectRadius: 0.1,
  });
  s2.addText(
    multiLine([
      "Two-Process Model(수면압+일주기리듬) +",
      "카페인 약동학·약력학(PK/PD) 상호작용 모델",
      "— 수면과학 논문 기반의 검증된 공식 사용",
    ]),
    {
      x: 5.35, y: 3.85, w: 3.9, h: 0.95,
      fontSize: 11, color: COLOR.ink900,
      align: "left", valign: "middle", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.35,
    }
  );

  // ── Slide 3 — 4주 로드맵 ─────────────────────────────────
  let s3 = pres.addSlide();
  addContentFrame(pres, s3, "프로젝트 로드맵 (4주)", "로드맵");

  const roadmap = [
    {
      w: "1주차", status: "완료", active: false,
      items: ["아이디어 검증 및 문제 정의", "기획서 작성 (v1 → v2)", "디자인 문서·스킬 설정", "프로토타입 제작 → React 이식"],
    },
    {
      w: "2주차", status: "진행 중", active: true,
      items: ["Process S/C(수면압·일주기) 구현", "카페인 PK/PD 근사 모델 구현", "안전 섭취 한도 로직", "목표 각성 시각 역산(그리드 탐색)"],
    },
    {
      w: "3주차", status: "다음 순서", active: false,
      items: ["다중 시험 통합 최적화", "Supabase 연동", "화면에 계산 기능 실제 연결"],
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
  s3.addText("지금 여기: 2주차 — 화면 없이도 계산 로직이 순수 함수로 끝까지 완성된 상태를 목표로 함", {
    x: 0.5, y: rY + rH + 0.18, w: 9, h: 0.32,
    fontSize: 10.5, italic: true, color: COLOR.ink600,
    align: "center", fontFace: FONT, margin: 0,
  });

  // ── Slide 4 — 2주차 목표 · 진행상황 체크리스트 ────────────
  let s4 = pres.addSlide();
  addContentFrame(pres, s4, "2주차 목표 · 진행 상황 (07/13 ~ 07/16)", "2주차 · 진행 상황");

  s4.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 1.35, w: 9, h: 0.55,
    fill: { color: COLOR.brandSoft }, rectRadius: 0.08,
  });
  s4.addText(
    "목표: 화면 없이도 \"입력 → 시험 시작 시각에 각성도가 최고가 되는 스케줄\"까지 순수 함수로 계산되게 만들기",
    {
      x: 0.7, y: 1.35, w: 8.6, h: 0.55,
      fontSize: 11, bold: true, color: COLOR.brandStrong,
      align: "center", valign: "middle", fontFace: FONT, margin: 0,
    }
  );

  const doneItems = [
    "Express 서버 스캐폴딩",
    "Process S(수면압) · Process C(일주기리듬)",
    "수면관성 · 오후슬럼프 보정",
    "카페인 근사 모델 (PK + PD + 결합)",
    "안전 섭취 한도 로직",
    "목표 각성 시각 역산 (시험 시작 시각 그대로 + 후보 그리드 탐색)",
  ];
  s4.addText("완료 (2주차 범위)", {
    x: 0.5, y: 2.1, w: 4.3, h: 0.3,
    fontSize: 11.5, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  doneItems.forEach((it, i) => {
    const iy = 2.46 + i * 0.44;
    iconBadge(pres, s4, 0.68, iy + 0.15, 0.26, icons.check, 0.65, COLOR.surface);
    s4.addText(it, {
      x: 0.9, y: iy, w: 3.9, h: 0.4,
      fontSize: 9.7, color: COLOR.ink900,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
  });

  s4.addText("3주차로 이동", {
    x: 5.1, y: 2.1, w: 4.4, h: 0.3,
    fontSize: 11.5, bold: true, color: COLOR.ink600,
    align: "left", fontFace: FONT, margin: 0,
  });
  const movedItems = [
    ["다중 시험 통합 최적화", "(그리드 결정변수 정의 — #10)"],
    ["Supabase 프로젝트 생성 및 마이그레이션", "(#14)"],
  ];
  movedItems.forEach((lines, i) => {
    const iy = 2.46 + i * 0.85;
    s4.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 5.1, y: iy, w: 4.4, h: 0.72,
      fill: { color: COLOR.surfaceMuted }, rectRadius: 0.08,
    });
    iconBadge(pres, s4, 5.4, iy + 0.36, 0.32, icons.arrow, 0.6, COLOR.surface);
    s4.addText(multiLine(lines), {
      x: 5.68, y: iy + 0.08, w: 3.7, h: 0.56,
      fontSize: 9.7, color: COLOR.ink600,
      align: "left", valign: "middle", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.2,
    });
  });

  // ── Slide 5 — 기술 스택 개요 ─────────────────────────────
  let s5 = pres.addSlide();
  addContentFrame(pres, s5, "서비스 기술 지도", "기술 스택");

  const stack = [
    {
      icon: icons.react, name: "FE — React",
      lines: ["입력 폼·캘린더 UI, 각성도 그래프·타임라인 시각화.", "5개 화면 모두 구현됐지만 아직 mock 데이터로 동작"],
    },
    {
      icon: icons.server, name: "BE — Express",
      lines: ["2주차에 계산 엔진(Two-Process+카페인) 순수 함수를", "완성. 아직 화면과 연결하는 API는 3주차 작업"],
    },
    {
      icon: icons.database, name: "DB — Supabase (Postgres)",
      lines: ["카페인 함량표·반감기·안전 섭취 한도 등", "참고용 정적 데이터 저장 — 테이블 설계만 완료"],
    },
  ];
  const stW = 2.87, stGap = 0.2, stY = 1.35, stH = 1.65;
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
      x: sx + 0.18, y: stY + 0.78, w: stW - 0.36, h: 0.8,
      fontSize: 8.5, color: COLOR.ink600,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.2,
    });
  });

  s5.addText("계산 엔진 — server/src/calc/", {
    x: 0.5, y: stY + stH + 0.28, w: 9, h: 0.32,
    fontSize: 12.5, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  s5.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: stY + stH + 0.66, w: 9, h: SAFE_BOTTOM - (stY + stH + 0.66),
    fill: { color: COLOR.brandSoft }, rectRadius: 0.09,
  });
  s5.addText(
    "processS · processC · sleepInertia · lunchDip · caffeineConcentration · caffeineEffect · alertness · dailyCaffeineLimit · candidateSleepSegments · singleExamScheduleSearch  (총 11개 순수 함수 파일)",
    {
      x: 0.75, y: stY + stH + 0.66, w: 8.5, h: SAFE_BOTTOM - (stY + stH + 0.66),
      fontSize: 9.8, fontFace: "Consolas", color: COLOR.brandStrong,
      align: "left", valign: "middle", margin: 0, lineSpacingMultiple: 1.3,
    }
  );

  // ── Slide 5.5 — React 프로토타입 소개 ─────────────────────
  let sProto = pres.addSlide();
  addContentFrame(pres, sProto, "React 프로토타입 소개", "프론트엔드");

  const protoCardY = 1.35, protoCardH = 1.65;
  sProto.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 1, y: protoCardY, w: 8, h: protoCardH,
    fill: { color: COLOR.brandSoft }, rectRadius: 0.12,
  });
  iconBadge(pres, sProto, 1.85, protoCardY + 0.5, 0.7, icons.react, 0.5, COLOR.surface);
  sProto.addText("홈 → 정보 입력 → 처리 중 → 결과 → 스케줄 조정", {
    x: 2.35, y: protoCardY + 0.22, w: 6.4, h: 0.4,
    fontSize: 13.5, bold: true, color: COLOR.brandStrong,
    align: "left", fontFace: FONT, margin: 0,
  });
  sProto.addText("5개 화면이 실제로 라우팅까지 연결된 동작하는 React 앱 (client/)", {
    x: 2.35, y: protoCardY + 0.64, w: 6.4, h: 0.35,
    fontSize: 11.5, color: COLOR.brandStrong,
    align: "left", fontFace: FONT, margin: 0,
  });
  const protoPills = ["React 19", "TypeScript", "Vite", "react-router-dom", "CSS Modules"];
  let pillX = 2.35;
  const pillY = protoCardY + 1.12, pillH = 0.36;
  protoPills.forEach((label) => {
    const pillW = 0.18 + label.length * 0.088;
    sProto.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: pillX, y: pillY, w: pillW, h: pillH,
      fill: { color: COLOR.surface }, rectRadius: 0.18,
    });
    sProto.addText(label, {
      x: pillX, y: pillY, w: pillW, h: pillH,
      fontSize: 9, bold: true, color: COLOR.brand,
      align: "center", valign: "middle", fontFace: FONT, margin: 0,
    });
    pillX += pillW + 0.12;
  });

  sProto.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: protoCardY + protoCardH + 0.25, w: 9, h: 1.1,
    fill: { color: COLOR.surfaceMuted }, rectRadius: 0.1,
  });
  sProto.addText("로컬 개발 서버", {
    x: 0.75, y: protoCardY + protoCardH + 0.42, w: 8.5, h: 0.28,
    fontSize: 10, bold: true, color: COLOR.ink600,
    align: "left", fontFace: FONT, margin: 0,
  });
  sProto.addText("http://localhost:5173/   (npm run dev --prefix client)", {
    x: 0.75, y: protoCardY + protoCardH + 0.68, w: 8.5, h: 0.32,
    fontSize: 13, bold: true, color: COLOR.brand,
    align: "left", fontFace: "Consolas", margin: 0,
  });
  sProto.addText(
    [
      { text: "아직 배포 전: ", options: { bold: true } },
      { text: "GitHub Pages(dodeho.github.io/hub/)엔 예전 정적 HTML 목업이 그대로 떠 있다 — React 앱 배포는 화면·계산 엔진이 연결되는 3주차에 맞출 예정", options: {} },
    ],
    {
      x: 0.75, y: protoCardY + protoCardH + 0.98, w: 8.5, h: 0.3,
      fontSize: 8.7, color: COLOR.ink600,
      align: "left", fontFace: FONT, margin: 0,
    }
  );

  // ── Slide 6 — 계산 모델 개념 ─────────────────────────────
  let s6 = pres.addSlide();
  addContentFrame(pres, s6, "어떻게 계산할까 — 모델 개념", "계산 엔진 · 개념");

  const concepts = [
    { icon: icons.bed, title: "졸음은 쌓인다 (Process S)", body: "깨어있는 시간이 길수록 졸음(수면압)이 쌓이고, 자는 동안 풀린다" },
    { icon: icons.chart, title: "생체시계가 있다 (Process C)", body: "하루 주기로 오르내리는 원래 정해진 각성 리듬이 따로 있다" },
    { icon: icons.mug, title: "카페인이 일시적으로 억제한다", body: "카페인이 졸음 신호를 일시적으로 눌러줘서, 원하는 시각에 각성도를 끌어올릴 수 있다" },
  ];
  const ccW = 2.87, ccGap = 0.2, ccY = 1.55, ccH = 2.05;
  concepts.forEach((c, i) => {
    const cx = 0.5 + i * (ccW + ccGap);
    s6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: cx, y: ccY, w: ccW, h: ccH,
      fill: { color: COLOR.surfaceMuted }, rectRadius: 0.1,
    });
    iconBadge(pres, s6, cx + ccW / 2, ccY + 0.5, 0.6, c.icon, 0.55, COLOR.surface);
    s6.addText(c.title, {
      x: cx + 0.15, y: ccY + 0.9, w: ccW - 0.3, h: 0.5,
      fontSize: 11.5, bold: true, color: COLOR.ink900,
      align: "center", valign: "top", fontFace: FONT, margin: 0,
    });
    s6.addText(c.body, {
      x: cx + 0.2, y: ccY + 1.38, w: ccW - 0.4, h: 0.6,
      fontSize: 9.2, color: COLOR.ink600,
      align: "center", valign: "top", fontFace: FONT, margin: 0,
    });
  });

  s6.addText("2주차에 세 개를 전부 순수 함수로 구현하고, 결합·검증까지 마쳤다", {
    x: 0.5, y: ccY + ccH + 0.2, w: 9, h: 0.3,
    fontSize: 11.5, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });

  s6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: ccY + ccH + 0.56, w: 9, h: 0.7,
    fill: { color: COLOR.brandSoft }, rectRadius: 0.09,
  });
  s6.addText(
    [
      { text: "결합 공식: ", options: { bold: true } },
      { text: "P(t) = P0(t) × gPD(t)  — 수면압+일주기리듬으로 만든 기본 각성도(P0)에, 카페인 보정 계수(gPD)를 곱해 최종 각성도를 구한다", options: {} },
    ],
    {
      x: 0.75, y: ccY + ccH + 0.56, w: 8.5, h: 0.7,
      fontSize: 10.5, color: COLOR.brandStrong,
      align: "left", valign: "middle", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.3,
    }
  );
  s6.addText(
    [
      { text: "참고: Two-Process Model(Borbély 1982) + Ramakrishnan et al.(2016) UMP — ", options: {} },
      {
        text: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5020365/",
        options: { hyperlink: { url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5020365/" } },
      },
    ],
    {
      x: 0.5, y: ccY + ccH + 1.32, w: 9, h: 0.3,
      fontSize: 8.5, color: COLOR.ink400,
      align: "left", fontFace: FONT, margin: 0,
    }
  );

  // ── Slide 7~15 — 계산 엔진 코드 9개 ──────────────────────
  codeSlide(pres, {
    eyebrow: "2주차 · 계산 엔진 (1/8)",
    title: "Process S — 수면압",
    icon: icons.bed,
    fileNames: ["processS.ts"],
    formulaLines: [
      "깨어있는 동안: H(t) = μ + (H₀−μ)·e^(−(t−t₀)/χw)",
      "자는 동안:    H(t) = H₀·e^(−(t−t₀)/χs)",
      "χs = 4.2h(방전), χw = 18.2h(충전), μ = 1(상한)",
    ],
    rationaleLines: [
      "계산_모델_리서치.md 1장 수식을 그대로",
      "옮겼다. χs(방전 4.2h)·χw(충전 18.2h)·",
      "μ(상한 1)는 Two-Process Model 표준값",
      "(Borbély 1982, Daan·Beersma·Borbély",
      "1984)을 그대로 썼다 — 이 함수는 임의로",
      "튜닝한 값이 하나도 없는 구간이다.",
    ],
    sourceLine: "출처: arXiv 1311.1734",
  });

  codeSlide(pres, {
    eyebrow: "2주차 · 계산 엔진 (2/8)",
    title: "Process C — 일주기리듬",
    icon: icons.chart,
    fileNames: ["processC.ts"],
    formulaLines: [
      "C(t) = Σ aₙ·sin(2πn·t/24 + Φ)   (n = 1~5, 5-하모닉)",
      "a = [0.97, 0.22, 0.07, 0.03, 0.001]",
    ],
    rationaleLines: [
      "일주기 리듬은 사인파 하나로는 실제",
      "곡선과 잘 안 맞아서, 진폭이 다른 5개",
      "하모닉을 그대로 더하는 표준형을 썼다.",
      "위상(Φ)은 논문에 고정값이 없어서,",
      "최저점이 새벽 4시경에 오도록 5개",
      "하모닉을 다 더한 채로 직접 탐색해서",
      "맞춘 값이다(2026-07-13).",
    ],
  });

  codeSlide(pres, {
    eyebrow: "2주차 · 계산 엔진 (3/8)",
    title: "수면관성 · 오후슬럼프 보정",
    icon: icons.wrench,
    fileNames: ["sleepInertia.ts", "lunchDip.ts"],
    formulaLines: [
      "수면관성:   −0.3·e^(−경과시간/0.67h)   (기상 직후만)",
      "오후슬럼프: −0.15·e^(−(시각−14)²/2)   (매일 14시 중심)",
    ],
    rationaleLines: [
      "S+C만 더해서 곡선을 뽑아보니 기상",
      "직후 각성도가 비현실적으로 높게",
      "나왔다 — 검증 스크립트로 눈으로",
      "확인하다가 발견한 누락이라, 원 수식엔",
      "없던 두 보정 항을 추가로 반영했다.",
      "계수(0.3·0.15 등)는 대부분 근거 없는",
      "근사치이고, 수면관성 시간상수(0.67h)만",
      "Jewett & Kronauer(1999) 값을 썼다.",
    ],
  });

  codeSlide(pres, {
    eyebrow: "2주차 · 계산 엔진 (4/8)",
    title: "카페인 PK — 혈중농도",
    icon: icons.mug,
    fileNames: ["caffeineConcentration.ts"],
    formulaLines: [
      "C(t) = F·Dose·ka / (Vd·(ka−ke)) · (e^(−ke·Δt) − e^(−ka·Δt))",
      "F = 1, ka = 5/h, Vd = 0.7 L/kg",
    ],
    rationaleLines: [
      "경구 섭취 표준 1차 흡수/제거",
      "약동학(PK) 모델이다. F(생체이용률)=1,",
      "Vd=0.7L/kg는 공개 자료(NCBI) 기준값을",
      "그대로 썼고, ka(흡수속도)=5는 음료",
      "기준 최고혈중농도 도달 시간",
      "(39~42분)을 거꾸로 계산해서",
      "역산한 값이다.",
    ],
  });

  codeSlide(pres, {
    eyebrow: "2주차 · 계산 엔진 (5/8)",
    title: "카페인 PD — 각성도 보정",
    icon: icons.flask,
    fileNames: ["caffeineEffect.ts"],
    formulaLines: [
      "gPD(t) = 1 + Gmax·C(t)ⁿ / (EC50ⁿ + C(t)ⁿ)   (n = 1)",
      "Gmax = 0.05 ~ 0.25 (피로도에 따라 가변), EC50 = 2mg/L",
    ],
    rationaleLines: [
      "논문에서 정확한 Hill 계수를 못 구해서,",
      "공개된 표준 포화형 용량-반응 곡선",
      "(Hill/Michaelis-Menten)으로 근사하기로",
      "2주차 월요일에 방향을 확정했다.",
      "Gmax(최대 부스트)는 코드에 '근거 없는",
      "근사치'라고 명시해뒀고, EC50=2mg/L은",
      "200mg 섭취 시 최대혈중농도의 절반",
      "지점으로 잡았다.",
    ],
  });

  codeSlide(pres, {
    eyebrow: "2주차 · 계산 엔진 (6/8)",
    title: "최종 결합 — P(t)",
    icon: icons.layer,
    fileNames: ["baselineAlertness.ts", "alertness.ts"],
    formulaLines: [
      "P0(t) = (1−H(t)) + κ·C(t) + 수면관성 + 오후슬럼프",
      "P(t)  = P0(t) × gPD(t)      (κ = 0.2)",
    ],
    rationaleLines: [
      "sleepPressure는 '피로도'라서 각성도로",
      "쓰려면 뒤집어야(1−H) 하는데, 처음엔",
      "안 뒤집어서 '깨어있을수록 각성도가",
      "높다'는 반대 결과가 나온 걸 검증 중",
      "발견해서 고쳤다(코드 주석에 기록).",
      "κ(일주기 진폭 계수)=0.2는 원 논문값을",
      "못 구해 근사치로 잡은 값이다.",
    ],
  });

  codeSlide(pres, {
    eyebrow: "2주차 · 계산 엔진 (7/8)",
    title: "안전 섭취 한도",
    icon: icons.shield,
    fileNames: ["dailyCaffeineLimit.ts", "remainingCaffeineBudget.ts"],
    formulaLines: [
      "연령·건강상태별 한도 중 가장 낮은 값 적용",
      "20세 미만: min(100mg, 체중 × 2.5mg/kg)",
    ],
    rationaleLines: [
      "성인은 FDA 기준 고정 400mg 한도를",
      "쓰지만, 12~19세는 체중당 상한(mg/kg)",
      "권고가 일반적이라 나이 구간별로 계산",
      "방식을 다르게 뒀다. 임신·심장질환·",
      "불안불면처럼 여러 조건이 겹치면,",
      "그중 가장 엄격한(가장 낮은) 한도",
      "하나만 적용하도록 설계했다.",
    ],
  });

  codeSlide(pres, {
    eyebrow: "2주차 · 계산 엔진 (8/8)",
    title: "후보 그리드 탐색 — 목표 시각 역산",
    icon: icons.search,
    fileNames: ["candidateSleepSegments.ts", "singleExamScheduleSearch.ts"],
    formulaLines: [
      "평소/원래 시각 ±1시간, 15분 간격 그리드에서",
      "시험 시작 시각의 P(t)를 최대화하는 취침·기상·카페인 조합 탐색",
    ],
    rationaleLines: [
      "패널티·가중치 없는 단순 탐색으로 먼저",
      "만들었다 — 아직 검증 안 된 S/C/카페인",
      "함수 위에 무거운 최적화 로직까지 한",
      "번에 얹으면, 버그가 생체수학 계산",
      "문제인지 최적화 로직 문제인지 구분이",
      "안 되기 때문이다(2주차_계획.md 3.2).",
      "목표 시각은 여유시간을 빼지 않은",
      "시험 시작 시각 그대로 쓴다 — 여유시간은",
      "사람마다 편차가 커서 계산에 넣지 않고",
      "화면 안내 문구로 대체(2026-07-16 결정).",
      "이 채점 구조를 3주차 다중 시험",
      "최적화가 그대로 재사용할 예정이다.",
    ],
  });

  // ── Slide 16 — 이번 주 핵심 결과 ─────────────────────────
  let s16 = pres.addSlide();
  addContentFrame(pres, s16, "이번 주 핵심 결과 — 목표 각성 시각 역산", "2주차 · 핵심 결과");

  s16.addText(
    "예시: 체중 65kg · 카페인 민감도 \"보통\" · 08시 커피 200mg · 09시 시험 — 목표 시각은 09시(시험 시작) 그대로",
    {
      x: 0.5, y: 1.35, w: 9, h: 0.32,
      fontSize: 10.5, color: COLOR.ink600,
      align: "left", fontFace: FONT, margin: 0,
    }
  );

  const cmpY = 1.85, cmpH = 2.2, cmpW = 3.85, cmpGap = 1.0;
  const beforeX = 0.5, afterX = beforeX + cmpW + cmpGap;

  s16.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: beforeX, y: cmpY, w: cmpW, h: cmpH,
    fill: { color: COLOR.surfaceMuted }, rectRadius: 0.1,
  });
  s16.addText("평소 스케줄 그대로", {
    x: beforeX + 0.25, y: cmpY + 0.2, w: cmpW - 0.5, h: 0.34,
    fontSize: 12, bold: true, color: COLOR.ink600,
    align: "left", fontFace: FONT, margin: 0,
  });
  s16.addText("0.7196", {
    x: beforeX + 0.25, y: cmpY + 0.58, w: cmpW - 0.5, h: 0.75,
    fontSize: 34, bold: true, color: COLOR.ink600,
    align: "left", fontFace: FONT, margin: 0,
  });
  s16.addText("시험 시작 시각 P(t) 점수", {
    x: beforeX + 0.25, y: cmpY + 1.3, w: cmpW - 0.5, h: 0.28,
    fontSize: 9, color: COLOR.ink400,
    align: "left", fontFace: FONT, margin: 0,
  });
  s16.addText("취침 23:00 · 기상 07:00", {
    x: beforeX + 0.25, y: cmpY + 1.68, w: cmpW - 0.5, h: 0.34,
    fontSize: 10.5, color: COLOR.ink600,
    align: "left", fontFace: FONT, margin: 0,
  });

  arrowBetween(pres, s16, beforeX + cmpW + 0.15, cmpY + cmpH / 2, cmpGap - 0.3, COLOR.brand);

  s16.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: afterX, y: cmpY, w: cmpW, h: cmpH,
    fill: { color: COLOR.brandSoft }, line: { color: COLOR.brand, width: 1.5 }, rectRadius: 0.1,
  });
  s16.addText("탐색으로 찾은 최적 스케줄", {
    x: afterX + 0.25, y: cmpY + 0.2, w: cmpW - 0.5, h: 0.34,
    fontSize: 12, bold: true, color: COLOR.brandStrong,
    align: "left", fontFace: FONT, margin: 0,
  });
  s16.addText("0.7486", {
    x: afterX + 0.25, y: cmpY + 0.58, w: cmpW - 0.5, h: 0.75,
    fontSize: 34, bold: true, color: COLOR.brandStrong,
    align: "left", fontFace: FONT, margin: 0,
  });
  s16.addText("시험 시작 시각 P(t) 점수  (+4.0%)", {
    x: afterX + 0.25, y: cmpY + 1.3, w: cmpW - 0.5, h: 0.28,
    fontSize: 9, bold: true, color: COLOR.brand,
    align: "left", fontFace: FONT, margin: 0,
  });
  s16.addText("취침 22:00 · 기상 07:30", {
    x: afterX + 0.25, y: cmpY + 1.68, w: cmpW - 0.5, h: 0.34,
    fontSize: 10.5, bold: true, color: COLOR.brandStrong,
    align: "left", fontFace: FONT, margin: 0,
  });

  s16.addText(
    multiLine([
      "검증 스크립트(verifySingleExamSchedule.ts)로 확인 — 취침·기상·카페인 후보를 ±1시간 그리드에서 탐색한 결과,",
      "1시간 더 일찍 자고 30분 늦게 일어나는 조합이 시험 시작 시각의 각성도를 더 높인다는 걸 수치로 확인했다.",
    ]),
    {
      x: 0.5, y: cmpY + cmpH + 0.22, w: 9, h: 0.6,
      fontSize: 9.8, italic: true, color: COLOR.ink600,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.3,
    }
  );

  // ── Slide 17 — 이번 주 의사결정 · 이슈 ───────────────────
  let s17 = pres.addSlide();
  addContentFrame(pres, s17, "이번 주 의사결정 · 이슈", "2주차 · 의사결정");

  const decisions = [
    ["카페인 근사 모델 확정 — 표준 포화형 곡선(Hill n=1)", "으로 근사, Gmax는 근거 없는 근사치로 명시(월요일)"],
    ["검증 중 발견한 보정 항 추가 — 수면관성 ·", "오후슬럼프 딥을 원 수식에 보완(화요일)"],
    ["sleepPressure 부호 버그 수정 — 각성도 계산 시", "뒤집어야 함을 검증 스크립트로 확인 후 수정"],
    ["목표 각성 시각에서 이동시간 제외 — 통학 방식이", "제각각이라 일반화 어려워 안내 문구로 대체(수요일)"],
    ["후보 탐색 그리드 확정 — ±1시간·15분 간격,", "카페인은 시각만 후보로 흔들고 용량은 고정(오늘)"],
    ["여유시간도 계산에서 제외 — 목표는 그냥", "\"시험 시작 시각에 각성도 최고\", 안내 문구만 유지(오늘)"],
  ];
  // 목록을 카드 안에 넣고 카드 안에서 세로 중앙 정렬한다 — 페이지에 그냥 떠 있으면
  // 아래쪽에 용도를 알 수 없는 빈 공간이 남는데, 카드로 감싸면 그 여백이 카드 안쪽
  // 위아래 패딩으로 읽혀서 의도된 여백처럼 보인다(2026-07-16 수정)
  const decCardY = 1.35, decCardH = SAFE_BOTTOM - decCardY;
  s17.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: decCardY, w: 9, h: decCardH,
    fill: { color: COLOR.surfaceMuted }, rectRadius: 0.1,
  });
  const decItemSpacing = 0.66, decItemH = 0.6;
  const decContentH = (decisions.length - 1) * decItemSpacing + decItemH;
  const decStartY = decCardY + (decCardH - decContentH) / 2;
  decisions.forEach((lines, i) => {
    const py = decStartY + i * decItemSpacing;
    const numCy = py + 0.15;
    s17.addShape(pres.shapes.OVAL, {
      x: 0.9, y: numCy - 0.13, w: 0.26, h: 0.26,
      fill: { color: COLOR.brand },
    });
    s17.addText(String(i + 1), {
      x: 0.9, y: numCy - 0.13, w: 0.26, h: 0.26,
      fontSize: 10.5, bold: true, color: COLOR.surface,
      align: "center", valign: "middle", fontFace: FONT, margin: 0,
    });
    s17.addText(multiLine(lines), {
      x: 1.3, y: py - 0.08, w: 7.8, h: decItemH,
      fontSize: 10.8, color: COLOR.ink900,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.25,
    });
  });

  // ── Slide 18 — 3주차로 넘어가는 것 ────────────────────────
  let s18 = pres.addSlide();
  addContentFrame(pres, s18, "3주차로 넘어가는 것 — GitHub 마일스톤 정리", "2주차 · 이슈 정리");

  s18.addText("GitHub 마일스톤 \"2주차\"에 남아있던 이슈 3개를 오늘 정리했다", {
    x: 0.5, y: 1.35, w: 9, h: 0.32,
    fontSize: 11, color: COLOR.ink600,
    align: "left", fontFace: FONT, margin: 0,
  });

  const issueRows = [
    { num: "#8", title: "목표 각성 시각 역산 (단순 탐색, 시험 1개)", status: "완료 — 닫음", closed: true },
    { num: "#10", title: "다중 시험 최적화 — 그리드 결정변수 정의", status: "3주차로 이동", closed: false },
    { num: "#14", title: "Supabase 프로젝트 생성 및 마이그레이션", status: "3주차로 이동", closed: false },
  ];
  issueRows.forEach((row, i) => {
    const iy = 1.85 + i * 0.85;
    s18.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.5, y: iy, w: 9, h: 0.7,
      fill: { color: row.closed ? COLOR.successBg : COLOR.surfaceMuted }, rectRadius: 0.09,
    });
    iconBadge(pres, s18, 0.92, iy + 0.35, 0.4, icons.github, 0.55, COLOR.surface);
    s18.addText(row.num, {
      x: 1.3, y: iy + 0.1, w: 0.7, h: 0.5,
      fontSize: 12, bold: true, color: COLOR.ink600,
      align: "left", valign: "middle", fontFace: "Consolas", margin: 0,
    });
    s18.addText(row.title, {
      x: 2.05, y: iy, w: 5.05, h: 0.7,
      fontSize: 11, color: COLOR.ink900,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
    s18.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 7.2, y: iy + 0.16, w: 2.1, h: 0.38,
      fill: { color: row.closed ? COLOR.successText : COLOR.brand }, rectRadius: 0.19,
    });
    s18.addText(row.status, {
      x: 7.2, y: iy + 0.16, w: 2.1, h: 0.38,
      fontSize: 9.5, bold: true, color: COLOR.surface,
      align: "center", valign: "middle", fontFace: FONT, margin: 0,
    });
  });

  s18.addText(
    multiLine([
      "#10 · #14는 원래 3주차 범위(다중 시험 최적화 · Supabase 연동)에 속하는 작업이라 마일스톤만 옮겼고,",
      "#8은 오늘 candidateSleepSegments.ts + singleExamScheduleSearch.ts로 실제 구현을 마쳐서 닫았다.",
    ]),
    {
      x: 0.5, y: 1.85 + issueRows.length * 0.85 + 0.15, w: 9, h: 0.6,
      fontSize: 9.8, italic: true, color: COLOR.ink600,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.3,
    }
  );

  // ── Slide 19 — 다음 주 예고 · 고민되는 점 ────────────────
  let s19 = pres.addSlide();
  addContentFrame(pres, s19, "다음 주 예고 · 고민되는 점", "3주차 · 다음 단계");

  const nexts = [
    {
      icon: icons.route, title: "3주차 목표",
      lines: ["\"계산하기\" 누르면 진짜", "계산돼서 결과가 나오는", "상태를 만드는 게 목표.", "다중 시험 최적화 + API +", "화면 연동까지 한 번에"],
    },
    {
      icon: icons.search, title: "가장 큰 과제",
      lines: ["시험 1개용 그리드 탐색을", "여러 시험 동시 배분으로", "확장해야 하는데, 패널티·", "가중치 설계를 어떻게 할지", "아직 구체화 안 됨"],
    },
    {
      icon: icons.bulb, title: "아직 안 정한 것들",
      lines: ["카페인 mg 직접 입력 폼,", "스케줄 조정 화면 날짜 선택", "UI, 공통 컴포넌트(Chart 등)", "분리 범위 — spec.md \"열려", "있는 질문\"에 정리해둠"],
    },
  ];
  const nnW = 2.87, nnGap = 0.2, nnY = 1.5, nnH = 3.15;
  nexts.forEach((w, i) => {
    const wx = 0.5 + i * (nnW + nnGap);
    s19.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: wx, y: nnY, w: nnW, h: nnH,
      fill: { color: COLOR.surfaceMuted }, rectRadius: 0.1,
    });
    iconBadge(pres, s19, wx + nnW / 2, nnY + 0.5, 0.6, w.icon, 0.55, COLOR.surface);
    s19.addText(w.title, {
      x: wx + 0.15, y: nnY + 0.9, w: nnW - 0.3, h: 0.4,
      fontSize: 11.5, bold: true, color: COLOR.ink900,
      align: "center", valign: "top", fontFace: FONT, margin: 0,
    });
    s19.addText(multiLine(w.lines), {
      x: wx + 0.2, y: nnY + 1.4, w: nnW - 0.4, h: 1.6,
      fontSize: 9.5, color: COLOR.ink600,
      align: "center", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.3,
    });
  });

  await pres.writeFile({ fileName: "2주차_진행공유.pptx" });
  console.log("done");
}

build();
