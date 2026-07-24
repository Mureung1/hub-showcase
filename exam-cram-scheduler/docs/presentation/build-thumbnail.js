// showcase / 공유용 썸네일 이미지(1280×720) 생성 스크립트.
//
// 텍스트는 pptxgenjs(Noto Sans KR)로, 각성도 곡선 그래픽은 SVG→PNG(sharp)로 만들어
// 한 장짜리 슬라이드에 합친 뒤 PDF→PNG로 뽑는다. 곡선 SVG에는 글자를 넣지 않는다 —
// sharp의 SVG 렌더러는 시스템 폰트 상황을 타서 한글이 깨질 수 있기 때문에, 글자는
// 전부 pptxgenjs 쪽에서 처리한다(발표자료 빌드와 동일한 폰트 파이프라인).
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");

// 디자인.md 토큰 (build-week*.js와 동일)
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
  tagCaffeine: "D99A3D",
};
const FONT = "Noto Sans KR";

// ── 각성도 곡선 SVG ──────────────────────────────────────
// 3일치(72시간) 각성도를 러프하게 그린다. 정확한 수치가 아니라 "밤에 떨어지고
// 낮에 오르며, 시험 시각에 카페인으로 정점을 만든다"는 모양만 전달하는 게 목적.
const SVG_W = 1640, SVG_H = 270;
const HOURS = 72;
const CAFF_T = 56; // 3일째 오전 8시 카페인 섭취
const EXAM_T = 58; // 3일째 오전 10시 시험

// 밤(수면) 구간 — [취침, 기상]
const NIGHTS = [[0, 7], [23, 31], [47, 55]];
const WAKE_TIMES = [-17, 7, 31, 55]; // 워밍업 구간 기상 시각 포함

// 실제 계산 엔진(server/src/calc/)이 쓰는 상수를 그대로 가져와 모양을 맞춘다
const TAU_WAKE = 18.2;  // 깨어있을 때 수면압이 차오르는 시간상수
const TAU_SLEEP = 4.2;  // 자는 동안 수면압이 풀리는 시간상수
const KAPPA = 0.2;      // 일주기 리듬 진폭 계수
// 기상 직후 수면관성. 실제 엔진 값(0.3 / 0.67h)을 그대로 쓰면 기상 지점에 계단 같은
// 꺾임이 생겨서, 썸네일에서는 모양만 남기고 완만하게 눌러 쓴다.
const INERTIA = 0.1, INERTIA_TAU = 1.1;

function asleepAt(t) {
  const h = ((t % 24) + 24) % 24;
  return h >= 23 || h < 7;
}

// 새벽 4시 최저, 오후 4시 최고
const circadian = (t) => Math.sin((2 * Math.PI * (t - 10)) / 24);

// 기상 직후 잠깬 멍한 구간 — 지수적으로 빠르게 사라진다
function inertiaAt(t) {
  return WAKE_TIMES.reduce(
    (sum, w) => (t >= w ? sum + INERTIA * Math.exp(-(t - w) / INERTIA_TAU) : sum),
    0,
  );
}

// 카페인: 빠르게 흡수되고 천천히 빠진다(흡수/제거 지수 두 개의 차)
function caffeineGain(t) {
  if (t < CAFF_T) return 1;
  const d = t - CAFF_T;
  return 1 + 0.3 * (Math.exp(-d / 5) - Math.exp(-d / 0.35));
}

// 자는 동안은 각성도를 부드럽게 눌러준다. 계단식으로 빼면 기상 시각마다
// 곡선이 수직으로 꺾여서 부자연스러우므로, 로지스틱으로 완만하게 전이시킨다.
const sig = (x) => 1 / (1 + Math.exp(-x / 0.8));
function awakeFactor(t) {
  const inNight = NIGHTS.reduce((sum, [a, b]) => sum + sig(t - a) * sig(b - t), 0);
  return 1 - 0.62 * Math.min(1, inNight);
}

// 수면압을 실제로 시간에 따라 적분해서 각성도 곡선을 만든다.
// 워밍업 24시간을 먼저 돌려 초기값의 영향을 지운다.
function simulate() {
  const DT = 0.02;
  const samples = [];
  let pressure = 0.5;
  for (let t = -24; t <= HOURS + DT; t += DT) {
    pressure += asleepAt(t)
      ? (-pressure / TAU_SLEEP) * DT
      : ((1 - pressure) / TAU_WAKE) * DT;
    if (t < 0) continue;
    const base = (1 - pressure) + KAPPA * circadian(t) - inertiaAt(t);
    samples.push({ t, v: base * caffeineGain(t) * awakeFactor(t) });
  }
  return samples;
}

function buildCurveSvg() {
  const padX = 12, padY = 20;
  const plotW = SVG_W - padX * 2, plotH = SVG_H - padY * 2;

  const samples = simulate();
  const values = samples.map((s) => s.v);
  const lo = Math.min(...values), hi = Math.max(...values);
  // 위아래로 살짝 여백을 남겨 곡선이 프레임에 닿지 않게 한다
  const norm = (v) => 0.06 + ((v - lo) / (hi - lo)) * 0.88;

  const xOf = (t) => padX + (t / HOURS) * plotW;
  const yOf = (v) => padY + (1 - norm(v)) * plotH;
  const valueAt = (t) => samples[Math.min(samples.length - 1, Math.round(t / 0.02))].v;

  // 촘촘한 폴리라인이면 베지어 없이도 매끄럽게 보인다
  const pts = samples
    .filter((_, i) => i % 3 === 0)
    .map((s) => `${xOf(s.t).toFixed(1)},${yOf(s.v).toFixed(1)}`);
  const linePath = "M " + pts.join(" L ");
  const baseY = (SVG_H - padY).toFixed(1);
  const areaPath = `${linePath} L ${xOf(HOURS).toFixed(1)},${baseY} L ${xOf(0).toFixed(1)},${baseY} Z`;

  const nightRects = NIGHTS.map(([a, b]) => {
    const x = xOf(a), w = xOf(b) - xOf(a);
    return `<rect x="${x.toFixed(1)}" y="${padY}" width="${w.toFixed(1)}" height="${plotH}" rx="14" fill="#${COLOR.tagSleep}" opacity="0.13"/>`;
  }).join("");

  const cx = xOf(CAFF_T), cy = yOf(valueAt(CAFF_T));
  const ex = xOf(EXAM_T), ey = yOf(valueAt(EXAM_T));

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_W}" height="${SVG_H}" viewBox="0 0 ${SVG_W} ${SVG_H}">
  <defs>
    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#${COLOR.brand}" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="#${COLOR.brand}" stop-opacity="0.01"/>
    </linearGradient>
  </defs>
  ${nightRects}
  <path d="${areaPath}" fill="url(#fill)"/>
  <path d="${linePath}" fill="none" stroke="#${COLOR.brand}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="${ex.toFixed(1)}" y1="${(ey - 30).toFixed(1)}" x2="${ex.toFixed(1)}" y2="${baseY}" stroke="#${COLOR.brandStrong}" stroke-width="3" stroke-dasharray="9 8" opacity="0.6"/>
  <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="11" fill="#${COLOR.tagCaffeine}" stroke="#FFFFFF" stroke-width="4"/>
  <circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="15" fill="#${COLOR.brandStrong}" stroke="#FFFFFF" stroke-width="5"/>
</svg>`);
}

async function build() {
  const curvePng = await sharp(buildCurveSvg()).png().toBuffer();
  const curveData = "image/png;base64," + curvePng.toString("base64");

  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9"; // 10 × 5.625in → 128DPI로 뽑으면 정확히 1280×720
  pres.title = "시험 벼락치기 스케줄러 — 썸네일";

  const s = pres.addSlide();
  s.background = { color: COLOR.surfaceMuted };

  // 흰 카드 (상하좌우 여백 동일)
  const M = 0.42;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: M, y: M, w: 10 - M * 2, h: 5.625 - M * 2,
    fill: { color: COLOR.surface }, rectRadius: 0.16,
    line: { color: COLOR.line, width: 1 },
  });

  const padX = 0.95;

  // 상단 배지
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: padX, y: 0.85, w: 3.15, h: 0.42,
    fill: { color: COLOR.brandSoft }, rectRadius: 0.21,
  });
  s.addText("수면과학 기반 스케줄 최적화", {
    x: padX, y: 0.85, w: 3.15, h: 0.42,
    fontSize: 12, bold: true, color: COLOR.brandStrong,
    align: "center", valign: "middle", fontFace: FONT, margin: 0,
  });

  // 제목
  s.addText("시험 벼락치기 스케줄러", {
    x: padX, y: 1.42, w: 8.2, h: 0.85,
    fontSize: 42, bold: true, color: COLOR.ink900,
    align: "left", valign: "middle", fontFace: FONT, margin: 0,
  });

  // 한 줄 설명 (직접 줄바꿈 — CLAUDE.md 발표자료 컨벤션)
  s.addText(
    [
      { text: "시험이 여러 개 겹치는 ", options: {} },
      { text: "시험기간 전체를 한 번에 고려", options: { bold: true, color: COLOR.brandStrong } },
      { text: "해서,", options: { breakLine: true } },
      { text: "시험 시각에 각성도가 최고가 되는 ", options: {} },
      { text: "수면·카페인 스케줄", options: { bold: true, color: COLOR.brandStrong } },
      { text: "을 계산합니다.", options: {} },
    ],
    {
      x: padX, y: 2.32, w: 8.2, h: 0.75,
      fontSize: 15, color: COLOR.ink600,
      align: "left", valign: "top", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.35,
    }
  );

  // 각성도 곡선
  s.addImage({ data: curveData, x: padX, y: 3.2, w: 8.2, h: 1.35 });

  // 범례
  const legend = [
    { label: "수면", color: COLOR.tagSleep },
    { label: "카페인 섭취", color: COLOR.tagCaffeine },
    { label: "시험 시각", color: COLOR.brandStrong },
  ];
  let lx = padX;
  legend.forEach((lg) => {
    s.addShape(pres.shapes.OVAL, {
      x: lx, y: 4.72, w: 0.16, h: 0.16,
      fill: { color: lg.color },
    });
    const w = 0.28 + lg.label.length * 0.13;
    s.addText(lg.label, {
      x: lx + 0.24, y: 4.66, w, h: 0.28,
      fontSize: 11, color: COLOR.ink600,
      align: "left", valign: "middle", fontFace: FONT, margin: 0,
    });
    lx += 0.24 + w + 0.35;
  });

  // 우측 하단 기술 스택
  s.addText("React · Express · Supabase", {
    x: 5.6, y: 4.66, w: 3.55, h: 0.28,
    fontSize: 11, bold: true, color: COLOR.ink400,
    align: "right", valign: "middle", fontFace: FONT, margin: 0,
  });

  await pres.writeFile({ fileName: "thumbnail.pptx" });
  console.log("done");
}

build();
