const path = require("path");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const {
  FaCheckCircle, FaArrowRight, FaReact, FaServer, FaDatabase,
  FaThLarge, FaBalanceScale, FaSnowflake, FaGlobe, FaSitemap,
  FaSearch, FaLightbulb, FaRoute, FaPlug, FaSlidersH, FaCalendarAlt,
} = require("react-icons/fa");

// 디자인.md 토큰 그대로 사용 (1·2주차 build-week*.js와 동일)
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

async function build() {
  let pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "N110_안정연";
  pres.title = "시험 벼락치기 스케줄러 — 3주차 진행 공유";

  const icons = {
    check: await iconToBase64Png(FaCheckCircle, "#" + COLOR.brand, 300),
    arrow: await iconToBase64Png(FaArrowRight, "#" + COLOR.brand, 300),
    react: await iconToBase64Png(FaReact, "#" + COLOR.brand, 300),
    server: await iconToBase64Png(FaServer, "#" + COLOR.brand, 300),
    database: await iconToBase64Png(FaDatabase, "#" + COLOR.brand, 300),
    grid: await iconToBase64Png(FaThLarge, "#" + COLOR.brand, 300),
    scale: await iconToBase64Png(FaBalanceScale, "#" + COLOR.brand, 300),
    snow: await iconToBase64Png(FaSnowflake, "#" + COLOR.brand, 300),
    globe: await iconToBase64Png(FaGlobe, "#" + COLOR.brand, 300),
    sitemap: await iconToBase64Png(FaSitemap, "#" + COLOR.brand, 300),
    search: await iconToBase64Png(FaSearch, "#" + COLOR.brand, 300),
    bulb: await iconToBase64Png(FaLightbulb, "#" + COLOR.brand, 300),
    route: await iconToBase64Png(FaRoute, "#" + COLOR.brand, 300),
    plug: await iconToBase64Png(FaPlug, "#" + COLOR.brand, 300),
    slider: await iconToBase64Png(FaSlidersH, "#" + COLOR.brand, 300),
    calendar: await iconToBase64Png(FaCalendarAlt, "#" + COLOR.brand, 300),
  };

  // ── Slide 1 — 표지 ──────────────────────────────────────
  let s1 = pres.addSlide();
  s1.background = { color: COLOR.surface };

  s1.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 0.55, w: 2.55, h: 0.42,
    fill: { color: COLOR.brandSoft }, rectRadius: 0.08,
  });
  s1.addText("3주차 진행 공유", {
    x: 0.5, y: 0.55, w: 2.55, h: 0.42,
    fontSize: 13, bold: true, color: COLOR.brandStrong,
    align: "center", valign: "middle", fontFace: FONT, margin: 0,
  });

  s1.addText("시험 벼락치기 스케줄러", {
    x: 0.5, y: 2.1, w: 9, h: 0.85,
    fontSize: 38, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  s1.addText("시험기간 대학생을 위한 수면·카페인 스케줄 최적화 도구 — 다중 시험 최적화 · 화면 연동 파트", {
    x: 0.5, y: 2.95, w: 9, h: 0.5,
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

  // ── Slide 2 — 프로젝트 소개 · 문제 정의 (1·2주차와 동일) ──
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
      "그 결과, 시험이 여럿 겹치는 주간 전체를",
      "고려하지 못하고 수면부족·컨디션 저하가",
      "누적된다.",
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

  // ── Slide 3 — 4주 로드맵 (3주차가 현재) ───────────────────
  let s3 = pres.addSlide();
  addContentFrame(pres, s3, "프로젝트 로드맵 (4주)", "로드맵");

  const roadmap = [
    {
      w: "1주차", status: "완료", active: false,
      items: ["아이디어 검증 및 문제 정의", "기획서 작성 (v1 → v2)", "디자인 문서·스킬 설정", "프로토타입 제작 → React 이식"],
    },
    {
      w: "2주차", status: "완료", active: false,
      items: ["Process S/C(수면압·일주기) 구현", "카페인 PK/PD 근사 모델 구현", "안전 섭취 한도 로직", "목표 각성 시각 역산(그리드 탐색)"],
    },
    {
      w: "3주차", status: "진행 중", active: true,
      items: ["다중 시험 통합 최적화(담금질)", "Supabase 연동 + 계산 API", "브라우저·서버·DB 실제 연동", "5개 화면에 계산 기능 연결"],
    },
    {
      w: "4주차", status: "다음 순서", active: false,
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
  s3.addText("지금 여기: 3주차 — \"계산하기\"를 누르면 실제로 계산돼 결과가 나오는, 끝까지 동작하는 앱을 완성하는 게 목표", {
    x: 0.5, y: rY + rH + 0.18, w: 9, h: 0.32,
    fontSize: 10.5, italic: true, color: COLOR.ink600,
    align: "center", fontFace: FONT, margin: 0,
  });

  // ── Slide 4 — 3주차 목표 · 진행 상황 (요일별) ─────────────
  let s4 = pres.addSlide();
  addContentFrame(pres, s4, "3주차 목표 · 진행 상황 (07/20 ~ 07/23)", "3주차 · 진행 상황");

  s4.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 1.35, w: 9, h: 0.55,
    fill: { color: COLOR.brandSoft }, rectRadius: 0.08,
  });
  s4.addText(
    multiLine([
      "목표: 흩어져 있던 계산 엔진·화면·DB를 하나로 연결해",
      "— \"계산하기\"를 누르면 여러 시험을 한 번에 고려한 스케줄이 실제로 나오게 만들기",
    ]),
    {
      x: 0.7, y: 1.35, w: 8.6, h: 0.55,
      fontSize: 11, bold: true, color: COLOR.brandStrong,
      align: "center", valign: "middle", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.2,
    }
  );

  const days = [
    {
      day: "월 07/20", tag: "계산 엔진 코어",
      lines: ["다중 시험 최적화 3종 구현", "후보 그리드·목적함수·국소 탐색", "+ 최소 수면시간 패널티"],
    },
    {
      day: "화 07/21", tag: "검증 · 버그 · DB",
      lines: ["검증 스크립트로 수렴 확인", "기상 시각·축 분리 버그 수정", "Supabase 프로젝트·마이그레이션"],
    },
    {
      day: "수 07/22", tag: "연동 기반 · 화면",
      lines: ["POST /api/schedule/calculate", "프록시·Context 연동 기반", "입력·처리중·결과 화면 API 연결"],
    },
    {
      day: "목 07/23", tag: "결과 마무리",
      lines: ["각성도 그래프 렌더·가로 스크롤", "localStorage 최근 기록", "스케줄 조정 재계산 연동"],
    },
  ];
  const dW = 2.16, dGap = 0.23, dY = 2.15, dH = 2.7;
  days.forEach((d, i) => {
    const dx = 0.5 + i * (dW + dGap);
    s4.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: dx, y: dY, w: dW, h: dH,
      fill: { color: COLOR.surfaceMuted }, rectRadius: 0.1,
    });
    s4.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: dx + 0.18, y: dY + 0.2, w: dW - 0.36, h: 0.34,
      fill: { color: COLOR.brand }, rectRadius: 0.17,
    });
    s4.addText(d.day, {
      x: dx + 0.18, y: dY + 0.2, w: dW - 0.36, h: 0.34,
      fontSize: 10.5, bold: true, color: COLOR.surface,
      align: "center", valign: "middle", fontFace: FONT, margin: 0,
    });
    s4.addText(d.tag, {
      x: dx + 0.2, y: dY + 0.64, w: dW - 0.4, h: 0.3,
      fontSize: 10.5, bold: true, color: COLOR.brandStrong,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
    d.lines.forEach((ln, j) => {
      const ly = dY + 1.0 + j * 0.52;
      s4.addShape(pres.shapes.OVAL, {
        x: dx + 0.2, y: ly + 0.09, w: 0.07, h: 0.07,
        fill: { color: COLOR.brand },
      });
      s4.addText(ln, {
        x: dx + 0.36, y: ly, w: dW - 0.5, h: 0.5,
        fontSize: 8.7, color: COLOR.ink900,
        align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.1,
      });
    });
  });

  // ── Slide 5 — 3주차에 닫은 이슈 한 번에 ───────────────────
  let s5 = pres.addSlide();
  addContentFrame(pres, s5, "3주차에 닫은 이슈 (GitHub)", "3주차 · 완료 이슈");

  s5.addText("다중 시험 최적화부터 화면 연동까지 — 3주차 마일스톤 이슈 18개를 모두 닫았다", {
    x: 0.5, y: 1.32, w: 9, h: 0.3,
    fontSize: 10.5, color: COLOR.ink600,
    align: "left", fontFace: FONT, margin: 0,
  });

  const issueGroups = [
    {
      icon: icons.search, title: "계산 엔진 (BE)",
      rows: [
        ["#10", "다중 시험 그리드 결정변수 정의"],
        ["#11", "목적함수(최솟값 채점) 구현"],
        ["#12", "로컬 탐색 휴리스틱(담금질)"],
        ["#13", "다중 시험 검증 스크립트"],
        ["#21", "최소 수면시간 패널티 반영"],
        ["#22", "추천 기상 시각 버그 수정"],
        ["#23", "취침·기상 축 분리"],
      ],
    },
    {
      icon: icons.plug, title: "연동 · DB (BE/DB)",
      rows: [
        ["#14", "Supabase 생성·마이그레이션"],
        ["#15", "POST /schedule/calculate"],
        ["#24", "연동 기반(프록시+Context)"],
      ],
    },
    {
      icon: icons.react, title: "화면 (FE)",
      rows: [
        ["#16", "정보 입력 화면 API 연동"],
        ["#17", "처리 중 실제 응답 대기"],
        ["#18", "결과 추천·경고 렌더링"],
        ["#25", "각성도 그래프 렌더링"],
        ["#26", "각성도 그래프 가로 스크롤"],
        ["#19", "localStorage 최근 기록"],
        ["#20", "스케줄 조정 재계산 연동"],
        ["#29", "기본 시험 시드 버그 수정"],
      ],
    },
  ];
  const igW = 2.87, igGap = 0.2, igY = 1.75, igH = SAFE_BOTTOM - igY;
  issueGroups.forEach((g, i) => {
    const gx = 0.5 + i * (igW + igGap);
    s5.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: gx, y: igY, w: igW, h: igH,
      fill: { color: COLOR.surfaceMuted }, rectRadius: 0.1,
    });
    iconBadge(pres, s5, gx + 0.38, igY + 0.36, 0.4, g.icon, 0.55, COLOR.surface);
    s5.addText(g.title, {
      x: gx + 0.65, y: igY + 0.16, w: igW - 0.8, h: 0.4,
      fontSize: 11.5, bold: true, color: COLOR.ink900,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
    const rowH = 0.335, rowsTop = igY + 0.72;
    g.rows.forEach((row, j) => {
      const ry = rowsTop + j * rowH;
      s5.addText(row[0], {
        x: gx + 0.2, y: ry, w: 0.55, h: rowH,
        fontSize: 9.5, bold: true, fontFace: "Consolas", color: COLOR.brandStrong,
        align: "left", valign: "middle", margin: 0,
      });
      s5.addText(row[1], {
        x: gx + 0.74, y: ry, w: igW - 0.9, h: rowH,
        fontSize: 8.9, color: COLOR.ink900,
        align: "left", valign: "middle", fontFace: FONT, margin: 0,
      });
    });
  });

  // ── Slide 6 — 서비스 기술 지도 (연결된 상태로 갱신) ────────
  let s6 = pres.addSlide();
  addContentFrame(pres, s6, "서비스 기술 지도", "기술 스택");

  const stack = [
    {
      icon: icons.react, name: "FE — React",
      lines: ["5개 화면이 mock 없이 실제 계산 API와 연결됨.", "각성도 그래프·추천 스케줄·최근 기록까지 동작"],
    },
    {
      icon: icons.server, name: "BE — Express",
      lines: ["POST /api/schedule/calculate 로 다중 시험", "최적화 엔진을 노출, Supabase 참고데이터 조회"],
    },
    {
      icon: icons.database, name: "DB — Supabase (Postgres)",
      lines: ["민감도별 반감기·안전 섭취 한도 등 참고", "데이터를 실제 SELECT로 조회 — 연결 완료"],
    },
  ];
  const stW = 2.87, stGap = 0.2, stY = 1.35, stH = 1.65;
  stack.forEach((s, i) => {
    const sx = 0.5 + i * (stW + stGap);
    s6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: sx, y: stY, w: stW, h: stH,
      fill: { color: COLOR.surfaceMuted }, rectRadius: 0.1,
    });
    iconBadge(pres, s6, sx + 0.45, stY + 0.4, 0.5, s.icon, 0.55, COLOR.surface);
    s6.addText(s.name, {
      x: sx + 0.8, y: stY + 0.18, w: stW - 0.95, h: 0.44,
      fontSize: 11.5, bold: true, color: COLOR.ink900,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
    s6.addText(multiLine(s.lines), {
      x: sx + 0.18, y: stY + 0.78, w: stW - 0.36, h: 0.8,
      fontSize: 8.5, color: COLOR.ink600,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.2,
    });
  });

  s6.addText("핵심 기능 하나: 계산하기 (입력 → 계산 엔진 → 결과)", {
    x: 0.5, y: stY + stH + 0.28, w: 9, h: 0.32,
    fontSize: 12.5, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  s6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: stY + stH + 0.66, w: 9, h: SAFE_BOTTOM - (stY + stH + 0.66),
    fill: { color: COLOR.brandSoft }, rectRadius: 0.09,
  });
  s6.addText(
    [
      { text: "정보 입력 화면 \"계산하기\" → ", options: { bold: true } },
      { text: "POST /api/schedule/calculate → ", options: { bold: true, fontFace: "Consolas" } },
      { text: "입력 검증 → DB에서 반감기·안전 한도 조회 → Two-Process+카페인으로 각성도 곡선 → 다중 시험 로컬 탐색 → 안전 한도 판정 → ", options: {} },
      { text: "{ 각성도 곡선, 추천 스케줄, 경고 } 응답", options: { bold: true } },
    ],
    {
      x: 0.75, y: stY + stH + 0.66, w: 8.5, h: SAFE_BOTTOM - (stY + stH + 0.66),
      fontSize: 10, color: COLOR.brandStrong,
      align: "left", valign: "middle", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.3,
    }
  );

  // ── Slide 7 — 서버 처리 흐름 (시퀀스 다이어그램 PNG) ───────
  let s7 = pres.addSlide();
  addContentFrame(pres, s7, "서버 처리 흐름 — POST /api/schedule/calculate", "아키텍처 · 시퀀스");

  const seqPath = path.join(__dirname, "..", "diagrams", "아키텍처-서버순서.png");
  // 원본 3242×2970 (가로/세로 ≈ 1.092). 제목 아래 영역에 비율 유지하며 최대한 크게.
  const seqBoxY = 1.3, seqBoxH = SAFE_BOTTOM - seqBoxY; // ≈ 4.05
  const seqImgH = seqBoxH, seqImgW = seqImgH * (3242 / 2970); // ≈ 4.42
  const seqImgX = (SLIDE_W - seqImgW) / 2;
  s7.addImage({
    path: seqPath,
    x: seqImgX, y: seqBoxY, w: seqImgW, h: seqImgH,
  });

  // ── Slide 8 — 계산 3단계 ─────────────────────────────────
  let s8 = pres.addSlide();
  addContentFrame(pres, s8, "어떻게 최적 스케줄을 찾을까 — 계산 3단계", "계산 엔진 · 다중 시험 최적화");

  const steps = [
    {
      icon: icons.grid, num: "1", title: "후보 만들기",
      file: "multiDayCandidates.ts",
      lines: [
        "취침·기상·카페인 시각·용량을",
        "각각 \"축\"으로 둔다. 평소값 ±1시간을",
        "15분 간격으로 → 밤마다 최대 9개 후보.",
        "밤 4개면 조합이 81⁴이라, 전체 조합은",
        "안 만들고 축 목록만 반환한다.",
      ],
    },
    {
      icon: icons.scale, num: "2", title: "점수 매기기",
      file: "multiDayObjective.ts",
      lines: [
        "스케줄 하나 = 시험별 시작 시각의",
        "각성도 중 최솟값(min).",
        "\"가장 컨디션 나쁠 시험\"을 끌어올리는",
        "방향으로 채점하고, 여기서 패널티",
        "(수면 부족·수면 중 섭취·한도 초과)를 뺀다.",
      ],
    },
    {
      icon: icons.snow, num: "3", title: "좋은 쪽으로 옮기기",
      file: "multiDayLocalSearch.ts",
      lines: [
        "담금질(simulated annealing). 축 하나를",
        "무작위로 골라 ±1칸 옮겨 채점 → 좋으면",
        "이동, 나빠도 초반엔 확률적으로 허용.",
        "무작위 재시작 8회 × 반복 500회 중",
        "가장 높은 점수를 최종 채택한다.",
      ],
    },
  ];
  const spW = 2.87, spGap = 0.2, spY = 1.4, spH = 3.0;
  steps.forEach((st, i) => {
    const sx = 0.5 + i * (spW + spGap);
    s8.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: sx, y: spY, w: spW, h: spH,
      fill: { color: COLOR.surfaceMuted }, rectRadius: 0.1,
    });
    iconBadge(pres, s8, sx + 0.42, spY + 0.42, 0.54, st.icon, 0.55, COLOR.surface);
    s8.addText(st.num + "단계", {
      x: sx + 0.78, y: spY + 0.2, w: spW - 0.95, h: 0.24,
      fontSize: 9.5, bold: true, color: COLOR.brand,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
    s8.addText(st.title, {
      x: sx + 0.78, y: spY + 0.42, w: spW - 0.95, h: 0.3,
      fontSize: 13, bold: true, color: COLOR.ink900,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
    s8.addText(st.file, {
      x: sx + 0.2, y: spY + 0.86, w: spW - 0.4, h: 0.26,
      fontSize: 8.7, fontFace: "Consolas", color: COLOR.brandStrong,
      align: "left", valign: "middle", margin: 0,
    });
    s8.addText(multiLine(st.lines), {
      x: sx + 0.22, y: spY + 1.2, w: spW - 0.42, h: spH - 1.35,
      fontSize: 9, color: COLOR.ink600,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.28,
    });
    if (i < steps.length - 1) {
      arrowBetween(pres, s8, sx + spW + 0.02, spY + spH / 2, spGap - 0.04, COLOR.brand);
    }
  });

  s8.addText(
    "→ 물리적으로 말이 안 되는 후보(기상 전 카페인, 시험 후 기상)는 1단계에서 이미 제외 — 자세한 채점·탐색은 다음 장",
    {
      x: 0.5, y: spY + spH + 0.16, w: 9, h: 0.3,
      fontSize: 9.8, italic: true, color: COLOR.ink600,
      align: "center", fontFace: FONT, margin: 0,
    }
  );

  // ── Slide 8b — 채점(가산점·패널티) + 담금질 상세 ───────────
  let s8b = pres.addSlide();
  addContentFrame(pres, s8b, "점수는 어떻게 매길까 — 가산점·패널티와 국소 탐색", "계산 엔진 · 채점 & 탐색");

  // 왼쪽: 채점 공식 + 패널티 3종
  const lX = 0.5, lW = 4.55, topY2 = 1.35;
  s8b.addText("채점 공식", {
    x: lX, y: topY2, w: lW, h: 0.3,
    fontSize: 13, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  s8b.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: lX, y: topY2 + 0.38, w: lW, h: 0.7,
    fill: { color: COLOR.brandSoft }, rectRadius: 0.09,
  });
  s8b.addText(
    [
      { text: "점수 = ", options: { bold: true } },
      { text: "시험별 각성도의 최솟값", options: { bold: true } },
      { text: "  −  패널티 3종", options: {} },
    ],
    {
      x: lX + 0.2, y: topY2 + 0.38, w: lW - 0.4, h: 0.7,
      fontSize: 12, color: COLOR.brandStrong,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    }
  );

  s8b.addText("패널티 3종 (점수에서 뺀다)", {
    x: lX, y: topY2 + 1.28, w: lW, h: 0.28,
    fontSize: 11.5, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  const penalties = [
    ["최소 수면시간 부족", "부족 1시간당  − 0.5"],
    ["자는 중 카페인 섭취", "기상까지 남은 1시간당  − 1.0"],
    ["하루 안전 한도 초과", "100mg 초과당  − 0.5  (0.005/mg)"],
  ];
  const penY = topY2 + 1.62, penH = 0.62, penGap = 0.14;
  penalties.forEach((p, i) => {
    const py = penY + i * (penH + penGap);
    s8b.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: lX, y: py, w: lW, h: penH,
      fill: { color: COLOR.surfaceMuted }, rectRadius: 0.08,
    });
    s8b.addShape(pres.shapes.RECTANGLE, {
      x: lX, y: py, w: 0.07, h: penH,
      fill: { color: COLOR.dangerIcon }, line: { type: "none" },
    });
    s8b.addText(p[0], {
      x: lX + 0.24, y: py + 0.08, w: lW - 0.44, h: 0.24,
      fontSize: 10.3, bold: true, color: COLOR.ink900,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
    s8b.addText(p[1], {
      x: lX + 0.24, y: py + 0.32, w: lW - 0.44, h: 0.24,
      fontSize: 9.5, color: COLOR.dangerText,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
  });
  s8b.addText(
    "가산점은 따로 없다 — \"시험 시각에 각성도가 높다\"가 곧 점수. 안전 관련 패널티는 각성도 차이(보통 0.01~0.05)보다 세게 잡아 항상 이기게 했다.",
    {
      x: lX, y: penY + 3 * (penH + penGap) + 0.02, w: lW, h: 0.55,
      fontSize: 8.7, italic: true, color: COLOR.ink600,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.25,
    }
  );

  // 오른쪽: 국소 탐색(담금질) 상세
  const rX = 5.35, rW2 = 4.15;
  s8b.addText("국소 탐색 — 담금질 휴리스틱", {
    x: rX, y: topY2, w: rW2, h: 0.3,
    fontSize: 13, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  s8b.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rX, y: topY2 + 0.38, w: rW2, h: 2.28,
    fill: { color: COLOR.surfaceMuted }, rectRadius: 0.09,
  });
  s8b.addText(
    multiLine([
      "왜 전수 탐색을 안 하나 — 밤이 몇 개만 돼도",
      "후보 조합이 81ⁿ으로 폭발해 다 못 뒤진다.",
      "",
      "① 축 하나를 무작위로 골라 ±1칸 옮긴다(이웃)",
      "② 채점해서 더 좋으면 그 이웃으로 이동",
      "③ 나쁘더라도 \"온도\"에 따른 확률로 가끔 이동",
      "   → 국소 최적점에 갇히지 않게",
      "④ 온도는 반복마다 기하급수로 낮아져,",
      "   후반엔 사실상 오르막으로만 이동(수렴)",
      "⑤ 무작위 초기값으로 8번 재시작 → 최고 채택",
    ]),
    {
      x: rX + 0.22, y: topY2 + 0.54, w: rW2 - 0.44, h: 2.0,
      fontSize: 9.2, color: COLOR.ink900,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.24,
    }
  );

  s8b.addText("탐색 파라미터", {
    x: rX, y: topY2 + 2.82, w: rW2, h: 0.26,
    fontSize: 11, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  const params = [["반복", "500"], ["재시작", "8"], ["초기온도", "0.1"], ["종료온도", "0.001"]];
  const pmW = (rW2 - 3 * 0.12) / 4, pmY = topY2 + 3.12, pmH = 0.6;
  params.forEach((pm, i) => {
    const px = rX + i * (pmW + 0.12);
    s8b.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: px, y: pmY, w: pmW, h: pmH,
      fill: { color: COLOR.brandSoft }, rectRadius: 0.08,
    });
    s8b.addText(pm[1], {
      x: px, y: pmY + 0.08, w: pmW, h: 0.3,
      fontSize: 14, bold: true, color: COLOR.brandStrong,
      align: "center", valign: "middle", fontFace: FONT, margin: 0,
    });
    s8b.addText(pm[0], {
      x: px, y: pmY + 0.36, w: pmW, h: 0.2,
      fontSize: 8, color: COLOR.ink600,
      align: "center", valign: "middle", fontFace: FONT, margin: 0,
    });
  });

  // ── Slide 9 — 실제 동작 화면 소개 (데모 링크) ─────────────
  let s9 = pres.addSlide();
  addContentFrame(pres, s9, "브라우저 · 서버 · DB를 연결한 실제 동작 화면", "데모");

  s9.addText("DEMO", {
    x: 0.5, y: 1.7, w: 9, h: 0.9,
    fontSize: 44, bold: true, color: COLOR.brand,
    align: "center", valign: "middle", fontFace: FONT, margin: 0, charSpacing: 4,
  });

  // 데이터 흐름 pill 행
  const flow = ["브라우저 React", "Vite 프록시 :5173", "Express :4000", "Supabase"];
  const fY = 3.15, fH = 0.48;
  let fx = 0.9;
  const fWidths = flow.map((t) => 0.5 + t.length * 0.12);
  const flowTotal = fWidths.reduce((a, b) => a + b, 0) + (flow.length - 1) * 0.55;
  fx = (SLIDE_W - flowTotal) / 2;
  flow.forEach((t, i) => {
    const fw = fWidths[i];
    s9.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: fx, y: fY, w: fw, h: fH,
      fill: { color: COLOR.brandSoft }, rectRadius: 0.24,
    });
    s9.addText(t, {
      x: fx, y: fY, w: fw, h: fH,
      fontSize: 10, bold: true, color: COLOR.brandStrong,
      align: "center", valign: "middle", fontFace: FONT, margin: 0,
    });
    if (i < flow.length - 1) {
      arrowBetween(pres, s9, fx + fw + 0.08, fY + fH / 2, 0.4, COLOR.brand);
    }
    fx += fw + 0.55;
  });

  // 링크 박스
  s9.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 2.5, y: 4.0, w: 5, h: 0.72,
    fill: { color: COLOR.ink900 }, rectRadius: 0.1,
  });
  s9.addText("http://localhost:5173/", {
    x: 2.5, y: 4.0, w: 5, h: 0.72,
    fontSize: 19, bold: true, color: COLOR.surface,
    align: "center", valign: "middle", fontFace: "Consolas", margin: 0,
  });
  s9.addText(
    "\"계산하기\"를 누르면 앞 장의 시퀀스(POST /api/schedule/calculate)가 실제로 실행됩니다 — 발표 중 다른 창에서 직접 시연",
    {
      x: 0.5, y: 4.85, w: 9, h: 0.35,
      fontSize: 9.5, italic: true, color: COLOR.ink600,
      align: "center", fontFace: FONT, margin: 0,
    }
  );

  // ── Slide 9.5 — AI와 일하는 방식 (3주 회고) ───────────────
  let sAI = pres.addSlide();
  addContentFrame(pres, sAI, "AI와 어떻게 일했나 — 3주간의 작업 방식", "회고 · 일하는 방식");

  sAI.addText("작업 순서 — 이슈 하나를 처리하는 사이클", {
    x: 0.5, y: 1.3, w: 9, h: 0.28,
    fontSize: 11.5, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });

  const cycle = [
    { t: "이슈 파악", d: ["GitHub 이슈로", "할 작업 범위 확인"] },
    { t: "설명 듣고 검증", d: ["AI 설명 듣고 근거·", "수식이 맞는지 검증"] },
    { t: "계획 이해", d: ["구현 계획을 이해될", "때까지 되묻기"] },
    { t: "작업 수행", d: ["다 이해한 뒤에야", "구현 작업 수행"] },
    { t: "이해 · 버그 테스트", d: ["코드 내용 이해 +", "검증 스크립트 테스트"] },
    { t: "커밋", d: ["commit 스킬로", "파일 단위 커밋"] },
  ];
  const cyW = 1.38, cyGap = 0.144, cyY = 1.62, cyH = 1.15;
  cycle.forEach((c, i) => {
    const cx = 0.5 + i * (cyW + cyGap);
    const isLast = i === cycle.length - 1;
    sAI.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: cx, y: cyY, w: cyW, h: cyH,
      fill: { color: isLast ? COLOR.brandSoft : COLOR.surfaceMuted },
      line: isLast ? { color: COLOR.brand, width: 1.2 } : { type: "none" },
      rectRadius: 0.09,
    });
    sAI.addShape(pres.shapes.OVAL, {
      x: cx + cyW / 2 - 0.15, y: cyY + 0.12, w: 0.3, h: 0.3,
      fill: { color: COLOR.brand },
    });
    sAI.addText(String(i + 1), {
      x: cx + cyW / 2 - 0.15, y: cyY + 0.12, w: 0.3, h: 0.3,
      fontSize: 10, bold: true, color: COLOR.surface,
      align: "center", valign: "middle", fontFace: FONT, margin: 0,
    });
    sAI.addText(c.t, {
      x: cx + 0.06, y: cyY + 0.46, w: cyW - 0.12, h: 0.24,
      fontSize: 9.3, bold: true, color: COLOR.ink900,
      align: "center", valign: "middle", fontFace: FONT, margin: 0,
    });
    sAI.addText(multiLine(c.d), {
      x: cx + 0.08, y: cyY + 0.72, w: cyW - 0.16, h: 0.36,
      fontSize: 7.3, color: COLOR.ink600,
      align: "center", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.2,
    });
    if (!isLast) {
      arrowBetween(pres, sAI, cx + cyW + 0.018, cyY + cyH / 2, cyGap - 0.036, COLOR.brand);
    }
  });

  // 왼쪽 — 쓰는 Skill 3개
  sAI.addText("쓰는 Skill 3개  (.claude/skills/)", {
    x: 0.5, y: 2.95, w: 4.55, h: 0.28,
    fontSize: 11.5, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  const skills = [
    ["/commit", ["\"커밋\" 한마디로 바로 실행 — Conventional Commits", "한국어 형식, 파일 하나당 커밋 하나로 분리"]],
    ["/new-component", ["새 컴포넌트 요청 시 CLAUDE.md·디자인.md를 먼저 읽고", "디자인 토큰 재사용, 문서에 없으면 임의로 안 정하고 질문"]],
    ["/daily-recap", ["하루 마무리 회고 — 한 일·목적·세부사항·", "헷갈린 점·배운 것 5가지를 표로"]],
  ];
  const skY = 3.28, skH = 0.62, skGap = 0.1;
  skills.forEach((s, i) => {
    const sy = skY + i * (skH + skGap);
    sAI.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.5, y: sy, w: 4.55, h: skH,
      fill: { color: COLOR.surfaceMuted }, rectRadius: 0.08,
    });
    sAI.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y: sy, w: 0.07, h: skH,
      fill: { color: COLOR.brand }, line: { type: "none" },
    });
    sAI.addText(s[0], {
      x: 0.68, y: sy + 0.06, w: 4.2, h: 0.22,
      fontSize: 10, bold: true, fontFace: "Consolas", color: COLOR.brandStrong,
      align: "left", valign: "middle", margin: 0,
    });
    sAI.addText(multiLine(s[1]), {
      x: 0.68, y: sy + 0.28, w: 4.25, h: 0.3,
      fontSize: 7.8, color: COLOR.ink600,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.18,
    });
  });

  // 오른쪽 — Agent + 함께 정한 규칙
  sAI.addText("Agent · 함께 정한 규칙", {
    x: 5.35, y: 2.95, w: 4.15, h: 0.28,
    fontSize: 11.5, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  sAI.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.35, y: 3.28, w: 4.15, h: 1.0,
    fill: { color: COLOR.surfaceMuted }, rectRadius: 0.08,
  });
  sAI.addText("Agent — 기본은 메인 세션에서 직접 진행", {
    x: 5.55, y: 3.36, w: 3.8, h: 0.24,
    fontSize: 9.3, bold: true, color: COLOR.ink900,
    align: "left", valign: "middle", fontFace: FONT, margin: 0,
  });
  sAI.addText(
    multiLine([
      "· Explore — 여러 파일을 한 번에 훑어야 할 때 코드베이스 탐색",
      "· Plan — 구현 전에 단계별 계획을 먼저 받아볼 때",
    ]),
    {
      x: 5.55, y: 3.64, w: 3.8, h: 0.56,
      fontSize: 8.2, color: COLOR.ink600,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.3,
    }
  );

  sAI.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.35, y: 4.4, w: 4.15, h: SAFE_BOTTOM - 4.4,
    fill: { color: COLOR.brandSoft }, rectRadius: 0.08,
  });
  sAI.addText("함께 정한 규칙 — CLAUDE.md에 적어둔 것", {
    x: 5.55, y: 4.48, w: 3.8, h: 0.24,
    fontSize: 9.3, bold: true, color: COLOR.brandStrong,
    align: "left", valign: "middle", fontFace: FONT, margin: 0,
  });
  sAI.addText(
    multiLine([
      "· 지시하지 않은 작업은 AI가 스스로 실행하지 않기",
      "· 빈틈은 임의로 채우지 말고 다시 질문하기",
      "· 코드 설명은 목적 → 방식 → 근거 → 구현 4단계로",
    ]),
    {
      x: 5.55, y: 4.75, w: 3.8, h: SAFE_BOTTOM - 4.82,
      fontSize: 8.2, color: COLOR.brandStrong,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.24,
    }
  );

  // ── Slide 10 — 다음 주 할 일 · 고민되는 점 ────────────────
  let s10 = pres.addSlide();
  addContentFrame(pres, s10, "다음 주 할 일 · 고민되는 점", "4주차 · 다음 단계");

  // 왼쪽: 4주차 할 일
  const tX = 0.5, tW = 4.15, tY = 1.4;
  s10.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: tX, y: tY, w: tW, h: SAFE_BOTTOM - tY,
    fill: { color: COLOR.surfaceMuted }, rectRadius: 0.1,
  });
  iconBadge(pres, s10, tX + 0.42, tY + 0.4, 0.5, icons.route, 0.55, COLOR.surface);
  s10.addText("4주차 할 일", {
    x: tX + 0.78, y: tY + 0.18, w: tW - 0.95, h: 0.44,
    fontSize: 13, bold: true, color: COLOR.ink900,
    align: "left", valign: "middle", fontFace: FONT, margin: 0,
  });
  const todos = [
    "추가 기능 (시간 여유 있으면)",
    "전체 테스트 · 버그 수정",
    "발표 자료 · 데모 준비",
    "남은 선택 이슈 정리",
    "  · #27 홈 화면 시험 캘린더",
    "  · #28 FE·BE 타입 통합",
  ];
  todos.forEach((t, i) => {
    const iy = tY + 0.95 + i * 0.52;
    const isSub = t.startsWith("  ·");
    if (!isSub) {
      s10.addShape(pres.shapes.OVAL, {
        x: tX + 0.3, y: iy + 0.1, w: 0.08, h: 0.08,
        fill: { color: COLOR.brand },
      });
    }
    s10.addText(t.trim(), {
      x: tX + (isSub ? 0.55 : 0.5), y: iy, w: tW - (isSub ? 0.75 : 0.7), h: 0.4,
      fontSize: isSub ? 9.5 : 10.8, color: isSub ? COLOR.ink600 : COLOR.ink900,
      bold: !isSub, align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
  });

  // 오른쪽: 고민되는 점 (3가지)
  const cX = 5.05, cW = 4.45, cY = 1.4;
  s10.addText("고민되는 점", {
    x: cX, y: cY, w: cW, h: 0.32,
    fontSize: 13, bold: true, color: COLOR.brandStrong,
    align: "left", fontFace: FONT, margin: 0,
  });
  const concerns = [
    {
      title: "FE·BE 타입을 통합할까 (#28)",
      lines: ["client(React)와 server(Express)가 요청·응답", "타입을 각자 정의 중. 공유 폴더로 합쳐 한 곳에서", "관리할지, 계층을 나눠 그대로 둘지 고민"],
    },
    {
      title: "결과 화면을 어떻게 마무리할까",
      lines: ["각성도 그래프·추천 스케줄·경고·캘린더를", "한 화면에 어디까지 담고 어떻게 정리해야", "사용자가 한눈에 이해할지"],
    },
    {
      title: "결과 캘린더의 정보 범위",
      lines: ["캘린더에 시험·수면·카페인·공부 중", "어디까지 통합해 보여줄지 —", "너무 많으면 복잡, 적으면 밋밋"],
    },
  ];
  const ccY = cY + 0.42, ccH = 1.1, ccGap = 0.12;
  concerns.forEach((c, i) => {
    const cy2 = ccY + i * (ccH + ccGap);
    s10.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: cX, y: cy2, w: cW, h: ccH,
      fill: { color: COLOR.surfaceMuted }, rectRadius: 0.09,
    });
    s10.addShape(pres.shapes.OVAL, {
      x: cX + 0.2, y: cy2 + 0.18, w: 0.28, h: 0.28,
      fill: { color: COLOR.brand },
    });
    s10.addText(String(i + 1), {
      x: cX + 0.2, y: cy2 + 0.18, w: 0.28, h: 0.28,
      fontSize: 11, bold: true, color: COLOR.surface,
      align: "center", valign: "middle", fontFace: FONT, margin: 0,
    });
    s10.addText(c.title, {
      x: cX + 0.6, y: cy2 + 0.13, w: cW - 0.78, h: 0.3,
      fontSize: 11, bold: true, color: COLOR.ink900,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
    s10.addText(multiLine(c.lines), {
      x: cX + 0.6, y: cy2 + 0.44, w: cW - 0.78, h: 0.6,
      fontSize: 8.6, color: COLOR.ink600,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.2,
    });
  });

  await pres.writeFile({ fileName: "3주차_진행공유.pptx" });
  console.log("done");
}

build();
