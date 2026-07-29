const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const { FaReact, FaServer, FaDatabase } = require("react-icons/fa");

// 디자인.md 토큰 그대로 사용 (build-week*.js와 동일)
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
  dangerBg: "FBEAE5",
  dangerText: "9A3324",
  dangerIcon: "C1442C",
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

// 원형 아이콘 배지. cx/cy는 배지의 "중심"
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

function arrowBetween(pres, slide, x, yMid, w, color, dir = "right") {
  slide.addShape(pres.shapes.LINE, {
    x, y: yMid, w, h: 0,
    line: dir === "left"
      ? { color, width: 1.5, beginArrowType: "triangle" }
      : { color, width: 1.5, endArrowType: "triangle" },
  });
}

async function build() {
  let pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "N110_안정연";
  pres.title = "시험 벼락치기 스케줄러 — 데모 영상용";

  const icons = {
    react: await iconToBase64Png(FaReact, "#" + COLOR.brand, 300),
    server: await iconToBase64Png(FaServer, "#" + COLOR.brand, 300),
    database: await iconToBase64Png(FaDatabase, "#" + COLOR.brand, 300),
  };

  // ── Slide 1 — 표지 (영상용: "3주차 진행 공유" 제거) ─────────
  let s1 = pres.addSlide();
  s1.background = { color: COLOR.surface };

  s1.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 0.55, w: 1.7, h: 0.42,
    fill: { color: COLOR.brandSoft }, rectRadius: 0.08,
  });
  s1.addText("서비스 데모", {
    x: 0.5, y: 0.55, w: 1.7, h: 0.42,
    fontSize: 13, bold: true, color: COLOR.brandStrong,
    align: "center", valign: "middle", fontFace: FONT, margin: 0,
  });

  s1.addText("시험 벼락치기 스케줄러", {
    x: 0.5, y: 2.1, w: 9, h: 0.85,
    fontSize: 38, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  s1.addText("시험 날짜·공부량·수면 패턴·카페인 상태를 넣으면, 시험 시작 시각에 각성도가 최고가 되도록 수면·카페인 스케줄을 계산해주는 도구", {
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

  // ── Slide 2 — 프로젝트 소개 · 문제 정의 (3주차 s2 그대로) ──
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

  // ── Slide 3 — 만든 과정 (로드맵, 영상용으로 다듬음) ────────
  let s3 = pres.addSlide();
  addContentFrame(pres, s3, "4주 동안 이렇게 만들었습니다", "만든 과정");

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
      w: "3주차", status: "완료", active: true,
      items: ["다중 시험 통합 최적화(담금질)", "Supabase 연동 + 계산 API", "브라우저·서버·DB 실제 연동", "5개 화면에 계산 기능 연결"],
    },
    {
      w: "4주차", status: "진행 중", active: false,
      items: ["추가 기능 · 결과 화면 마무리", "전체 테스트 · 버그 수정", "발표 자료 · 데모 준비"],
    },
  ];
  const rW = 2.1, rGap = 0.25, rY = 1.4, rH = 2.85;
  roadmap.forEach((r, i) => {
    const rx = 0.5 + i * (rW + rGap);
    // 전체 개요라 특정 주차 색칠 강조 없이 4주 모두 동일하게 "진하게" 표시
    s3.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: rx, y: rY, w: rW, h: rH,
      fill: { color: COLOR.surfaceMuted },
      line: { color: COLOR.line, width: 1 },
      rectRadius: 0.09,
    });
    s3.addText(r.w, {
      x: rx + 0.15, y: rY + 0.14, w: rW - 0.3, h: 0.34,
      fontSize: 15, bold: true, color: COLOR.brandStrong,
      align: "left", fontFace: FONT, margin: 0,
    });
    const itemRowH = 0.42, dotD = 0.06;
    r.items.forEach((it, j) => {
      const iy = rY + 0.58 + j * itemRowH;
      s3.addShape(pres.shapes.OVAL, {
        x: rx + 0.16, y: iy + itemRowH / 2 - dotD / 2, w: dotD, h: dotD,
        fill: { color: COLOR.brand },
      });
      s3.addText(it, {
        x: rx + 0.3, y: iy, w: rW - 0.45, h: itemRowH,
        fontSize: 8.7, color: COLOR.ink900,
        align: "left", valign: "middle", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.05,
      });
    });
    s3.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: rx + 0.15, y: rY + rH - 0.42, w: rW - 0.3, h: 0.3,
      fill: { color: COLOR.surface }, rectRadius: 0.2,
      line: { color: COLOR.line, width: 1 },
    });
    s3.addText(r.status, {
      x: rx + 0.15, y: rY + rH - 0.42, w: rW - 0.3, h: 0.3,
      fontSize: 9, bold: true, color: COLOR.ink600,
      align: "center", valign: "middle", fontFace: FONT, margin: 0,
    });
    if (i < roadmap.length - 1) {
      arrowBetween(pres, s3, rx + rW, rY + rH / 2, rGap, COLOR.ink400);
    }
  });
  s3.addText("결과: \"계산하기\"를 누르면 여러 시험을 한 번에 고려한 수면·카페인 스케줄이 실제로 나오는, 끝까지 동작하는 앱", {
    x: 0.5, y: rY + rH + 0.18, w: 9, h: 0.32,
    fontSize: 10.5, italic: true, color: COLOR.ink600,
    align: "center", fontFace: FONT, margin: 0,
  });

  // ── Slide 4 — 흐름도 (가로 3박스 아키텍처) ─────────────────
  let sA = pres.addSlide();
  addContentFrame(pres, sA, "계산하기 한 번에 — FE · BE · DB가 이렇게 움직입니다", "아키텍처 · 데이터 흐름");

  // 요청 라벨 + 화살표 (위)
  sA.addText("① 요청 — 입력값·평소 수면/카페인 패턴을  POST /api/schedule/calculate", {
    x: 0.5, y: 1.4, w: 9, h: 0.3,
    fontSize: 11, bold: true, color: COLOR.brandStrong,
    align: "center", fontFace: FONT, margin: 0,
  });
  arrowBetween(pres, sA, 0.7, 1.82, 8.6, COLOR.brand, "right");

  const aBoxes = [
    {
      icon: icons.react, name: "FE — React", sub: "client/ · 5개 화면",
      role: ["\"계산하기\"로 요청을 보내고,", "돌아온 각성도 그래프·추천", "스케줄·경고를 화면에 렌더"],
    },
    {
      icon: icons.server, name: "BE — Express", sub: "server/ · 계산 엔진",
      role: ["요청 검증 → DB 참고데이터 조회", "→ 다중 시험 최적화(담금질)로", "최적 스케줄 계산"],
    },
    {
      icon: icons.database, name: "DB — Supabase", sub: "Postgres · 참고 데이터",
      role: ["민감도별 카페인 반감기·", "안전 섭취 한도를", "SELECT로 제공"],
    },
  ];
  const aW = 2.6, aGap = 0.7, aY = 2.1, aH = 2.4;
  aBoxes.forEach((b, i) => {
    const bx = 0.5 + i * (aW + aGap);
    sA.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: bx, y: aY, w: aW, h: aH,
      fill: { color: COLOR.surfaceMuted },
      line: { color: COLOR.line, width: 1 }, rectRadius: 0.1,
    });
    iconBadge(pres, sA, bx + aW / 2, aY + 0.48, 0.62, b.icon, 0.55, COLOR.surface);
    sA.addText(b.name, {
      x: bx + 0.1, y: aY + 0.86, w: aW - 0.2, h: 0.3,
      fontSize: 14, bold: true, color: COLOR.ink900,
      align: "center", valign: "middle", fontFace: FONT, margin: 0,
    });
    sA.addText(b.sub, {
      x: bx + 0.1, y: aY + 1.18, w: aW - 0.2, h: 0.24,
      fontSize: 9.5, color: COLOR.brandStrong,
      align: "center", valign: "middle", fontFace: "Consolas", margin: 0,
    });
    sA.addText(multiLine(b.role), {
      x: bx + 0.2, y: aY + 1.52, w: aW - 0.4, h: 0.8,
      fontSize: 9.5, color: COLOR.ink600,
      align: "center", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.28,
    });
    if (i < aBoxes.length - 1) {
      const gapX = bx + aW + 0.05, gapW = aGap - 0.1, midY = aY + aH / 2;
      if (i === 1) {
        // BE ↔ DB: 요청(→)과 응답(←) 두 방향 — 실제로 DB에서 BE로 참고데이터가 돌아온다
        arrowBetween(pres, sA, gapX, midY - 0.16, gapW, COLOR.brand, "right");
        arrowBetween(pres, sA, gapX, midY + 0.16, gapW, COLOR.brand, "left");
      } else {
        arrowBetween(pres, sA, gapX, midY, gapW, COLOR.brand, "right");
      }
    }
  });

  // 응답 화살표 + 라벨 (아래)
  arrowBetween(pres, sA, 0.7, 4.82, 8.6, COLOR.brand, "left");
  sA.addText("② 응답 — 각성도 곡선 · 추천 스케줄 · 안전 경고를 되돌려 결과 화면에 표시", {
    x: 0.5, y: 4.92, w: 9, h: 0.3,
    fontSize: 11, bold: true, color: COLOR.brandStrong,
    align: "center", fontFace: FONT, margin: 0,
  });

  // ── Slide 5 — 작업 순서 (3주차 slide 11에서 가져옴, 확대) ──
  let s6 = pres.addSlide();
  addContentFrame(pres, s6, "AI와 어떻게 일했나 — 이슈 하나를 처리하는 작업 순서", "일하는 방식 · Agent 활용");

  s6.addText("GitHub 이슈 하나를 아래 6단계로 반복하며 3주간 개발했다", {
    x: 0.5, y: 1.35, w: 9, h: 0.3,
    fontSize: 11, color: COLOR.ink600,
    align: "left", fontFace: FONT, margin: 0,
  });

  const cycle = [
    { t: "이슈 파악", d: ["GitHub 이슈로", "작업 범위 확인"] },
    { t: "설명 듣고 검증", d: ["AI 설명 듣고 근거·", "수식이 맞는지 검증"] },
    { t: "계획 이해", d: ["구현 계획을 이해될", "때까지 되묻기"] },
    { t: "작업 수행", d: ["다 이해한 뒤에야", "구현 작업 수행"] },
    { t: "이해 · 테스트", d: ["코드 이해 + 검증", "스크립트로 테스트"] },
    { t: "커밋", d: ["commit 스킬로", "파일 단위 커밋"] },
  ];
  const cyW = 1.4, cyGap = 0.16, cyY = 1.78, cyH = 1.7;
  cycle.forEach((c, i) => {
    const cx = 0.5 + i * (cyW + cyGap);
    const isLast = i === cycle.length - 1;
    s6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: cx, y: cyY, w: cyW, h: cyH,
      fill: { color: isLast ? COLOR.brandSoft : COLOR.surfaceMuted },
      line: isLast ? { color: COLOR.brand, width: 1.2 } : { type: "none" },
      rectRadius: 0.09,
    });
    s6.addShape(pres.shapes.OVAL, {
      x: cx + cyW / 2 - 0.19, y: cyY + 0.2, w: 0.38, h: 0.38,
      fill: { color: COLOR.brand },
    });
    s6.addText(String(i + 1), {
      x: cx + cyW / 2 - 0.19, y: cyY + 0.2, w: 0.38, h: 0.38,
      fontSize: 12, bold: true, color: COLOR.surface,
      align: "center", valign: "middle", fontFace: FONT, margin: 0,
    });
    s6.addText(c.t, {
      x: cx + 0.06, y: cyY + 0.68, w: cyW - 0.12, h: 0.3,
      fontSize: 10.5, bold: true, color: COLOR.ink900,
      align: "center", valign: "middle", fontFace: FONT, margin: 0,
    });
    s6.addText(multiLine(c.d), {
      x: cx + 0.08, y: cyY + 1.02, w: cyW - 0.16, h: 0.56,
      fontSize: 8.3, color: COLOR.ink600,
      align: "center", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.22,
    });
    if (!isLast) {
      arrowBetween(pres, s6, cx + cyW + 0.02, cyY + cyH / 2, cyGap - 0.04, COLOR.brand, "right");
    }
  });

  // 하단 — CLAUDE.md에 정해둔 규칙 3개 (AI에게 지정한 작업 방식)
  s6.addText("CLAUDE.md에 정해둔 규칙 3가지", {
    x: 0.5, y: 3.72, w: 9, h: 0.28,
    fontSize: 11.5, bold: true, color: COLOR.ink900,
    align: "left", fontFace: FONT, margin: 0,
  });
  const rules = [
    ["설명은 4단계로", "목적 → 방식 → 근거 → 구현, 파일 하나씩만"],
    ["지시한 것만 실행", "시키지 않은 작업은 스스로 하지 않기"],
    ["빈틈은 되묻기", "안 정해진 부분은 임의로 안 채우고 질문"],
  ];
  const skW = 2.93, skGap = 0.2, skY = 4.06, skH = 0.6;
  rules.forEach((s, i) => {
    const sx = 0.5 + i * (skW + skGap);
    s6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: sx, y: skY, w: skW, h: skH,
      fill: { color: COLOR.surfaceMuted }, rectRadius: 0.08,
    });
    s6.addShape(pres.shapes.RECTANGLE, {
      x: sx, y: skY, w: 0.07, h: skH,
      fill: { color: COLOR.brand }, line: { type: "none" },
    });
    s6.addText(s[0], {
      x: sx + 0.2, y: skY + 0.08, w: skW - 0.35, h: 0.24,
      fontSize: 11, bold: true, fontFace: FONT, color: COLOR.brandStrong,
      align: "left", valign: "middle", margin: 0,
    });
    s6.addText(s[1], {
      x: sx + 0.2, y: skY + 0.32, w: skW - 0.35, h: 0.22,
      fontSize: 8.8, color: COLOR.ink600,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
  });

  s6.addText("그 외 — 커밋은 Conventional Commits(한국어)·파일 단위, 컴포넌트는 CSS Modules 디자인 토큰 재사용 (역시 CLAUDE.md에 기록)", {
    x: 0.5, y: skY + skH + 0.12, w: 9, h: 0.3,
    fontSize: 9, italic: true, color: COLOR.ink600,
    align: "center", fontFace: FONT, margin: 0,
  });

  await pres.writeFile({ fileName: "영상용_발표.pptx" });
  console.log("done");
}

build();
