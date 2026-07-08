const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const { FaMugHot, FaExclamationCircle, FaLightbulb, FaCheck, FaBalanceScale, FaCalendarAlt, FaUser } = require("react-icons/fa");

const COLOR = {
  espresso: "2E1A0F",
  espressoDeep: "241309",
  cream: "EDE0D0",
  creamMuted: "C9B8A4",
  caramel: "C17F3E",
  white: "FBF7F2",
  ink: "2E1A0F",
  cardBeige: "F7EEE0",
  innerBeige: "FFFFFF",
  mutedOnLight: "8A6C52",
};

function addContentFrame(pres, slide, title) {
  slide.background = { color: COLOR.espresso };
  slide.addText(title, {
    x: 0.5, y: 0.35, w: 9, h: 0.6,
    fontSize: 30, bold: true, color: COLOR.cream,
    align: "left", fontFace: "HYSinMyeongJo-Medium", margin: 0,
  });
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 1.15, w: 9, h: 4.05,
    fill: { color: COLOR.cardBeige }, rectRadius: 0.12,
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

function caffeineStructureSvg(color) {
  const c = "#" + color;
  const raw = fs.readFileSync(path.join(__dirname, "assets", "caffeine-skeletal.svg"), "utf8");
  return raw.replace(/fill="rgb\(0,\s*0,\s*0\)"/g, `fill="${c}"`);
}

async function build() {
  let pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "N110_안정연";
  pres.title = "시험 벼락치기 스케줄러";

  // Slide 1 — 표지
  let s1 = pres.addSlide();
  s1.background = { color: COLOR.espresso };

  const caffeineImg = await svgToBase64Png(caffeineStructureSvg(COLOR.cream), 900, 739);
  s1.addImage({
    data: caffeineImg, x: 1.8, y: 0.2, w: 6.4, h: 5.25, transparency: 87,
  });

  const mugIcon = await iconToBase64Png(FaMugHot, "#" + COLOR.caramel, 300);
  s1.addShape(pres.shapes.OVAL, {
    x: 4.45, y: 0.75, w: 1.1, h: 1.1,
    fill: { color: COLOR.espressoDeep },
  });
  s1.addImage({ data: mugIcon, x: 4.72, y: 1.02, w: 0.56, h: 0.56 });

  s1.addText("시험 벼락치기 스케줄러", {
    x: 0.5, y: 2.15, w: 9, h: 0.9,
    fontSize: 40, bold: true, color: COLOR.cream,
    align: "center", fontFace: "HYSinMyeongJo-Medium",
  });

  s1.addText("시험기간 대학생의 벼락치기 수면·카페인 스케줄을 최적화하는 도구", {
    x: 1, y: 3.05, w: 8, h: 0.6,
    fontSize: 18, color: COLOR.creamMuted,
    align: "center", fontFace: "HYSinMyeongJo-Medium",
  });

  s1.addText("N110_안정연", {
    x: 0.5, y: 5.05, w: 9, h: 0.4,
    fontSize: 13, color: COLOR.creamMuted,
    align: "center", fontFace: "HYSinMyeongJo-Medium",
  });

  // Slide 2 — 서비스 한눈에 보기
  let s2 = pres.addSlide();
  addContentFrame(pres, s2, "무엇을, 어떻게 해결하는가?");

  const problemIcon = await iconToBase64Png(FaExclamationCircle, "#" + COLOR.white, 300);
  const solutionIcon = await iconToBase64Png(FaLightbulb, "#" + COLOR.white, 300);

  const cards = [
    {
      x: 0.9,
      icon: problemIcon,
      header: "문제",
      body: "수면·카페인을 감으로 조절하다가 컨디션이 무너지고, 정작 시험 당일 상태가 안 좋아짐",
    },
    {
      x: 5.15,
      icon: solutionIcon,
      header: "해결",
      body: "자연어로 상황을 설명하면, 검증된 수면과학 모델로 시험 시작 시각 각성도를 최대화하는 스케줄을 계산",
    },
  ];

  for (const card of cards) {
    s2.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: card.x, y: 1.55, w: 3.95, h: 3.25,
      fill: { color: COLOR.innerBeige }, rectRadius: 0.1,
    });
    s2.addShape(pres.shapes.OVAL, {
      x: card.x + 1.625, y: 1.85, w: 0.7, h: 0.7,
      fill: { color: COLOR.caramel },
    });
    s2.addImage({ data: card.icon, x: card.x + 1.79, y: 2.01, w: 0.38, h: 0.38 });
    s2.addText(card.header, {
      x: card.x, y: 2.7, w: 3.95, h: 0.4,
      fontSize: 18, bold: true, color: COLOR.espresso,
      align: "center", fontFace: "HYSinMyeongJo-Medium", margin: 0,
    });
    s2.addText(card.body, {
      x: card.x + 0.3, y: 3.2, w: 3.35, h: 1.5,
      fontSize: 14, color: COLOR.espresso,
      align: "left", fontFace: "HYSinMyeongJo-Medium", valign: "top",
    });
  }

  // Slide 3 — 화면 흐름
  let s3 = pres.addSlide();
  addContentFrame(pres, s3, "화면 흐름");

  const screens = [
    { name: "홈", desc: "서비스 소개, 시작하기" },
    { name: "정보 입력", desc: "자연어 + 조건 입력" },
    { name: "처리 중", desc: "모델 계산 진행" },
    { name: "결과", desc: "각성도 그래프 + 추천" },
    { name: "스케줄 조정", desc: "슬라이더로 직접 조정" },
  ];

  const boxW = 1.4, boxGap = 0.3, boxY = 2.05, boxH = 1.45;
  const startX = 0.5 + (9 - (boxW * 5 + boxGap * 4)) / 2;

  screens.forEach((sc, i) => {
    const bx = startX + i * (boxW + boxGap);
    s3.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: bx, y: boxY, w: boxW, h: boxH,
      fill: { color: COLOR.innerBeige }, rectRadius: 0.08,
    });
    s3.addText(String(i + 1), {
      x: bx, y: boxY + 0.1, w: boxW, h: 0.3,
      fontSize: 11, bold: true, color: COLOR.caramel,
      align: "center", fontFace: "HYSinMyeongJo-Medium", margin: 0,
    });
    s3.addText(sc.name, {
      x: bx + 0.05, y: boxY + 0.42, w: boxW - 0.1, h: 0.45,
      fontSize: 13, bold: true, color: COLOR.espresso,
      align: "center", fontFace: "HYSinMyeongJo-Medium", margin: 0,
    });
    s3.addText(sc.desc, {
      x: bx + 0.08, y: boxY + 0.88, w: boxW - 0.16, h: 0.5,
      fontSize: 9, color: COLOR.espresso,
      align: "center", fontFace: "HYSinMyeongJo-Medium", margin: 0,
    });
    if (i < screens.length - 1) {
      s3.addShape(pres.shapes.LINE, {
        x: bx + boxW, y: boxY + boxH / 2, w: boxGap, h: 0,
        line: { color: COLOR.espresso, width: 1.5, endArrowType: "triangle" },
      });
    }
  });

  const loopSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 60">
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L0,6 L7,3 z" fill="${"#" + COLOR.espresso}" />
      </marker>
    </defs>
    <path d="M 380 4 L 380 46 L 20 46 L 20 4" fill="none" stroke="${"#" + COLOR.espresso}" stroke-width="2.5" stroke-dasharray="6 4" marker-end="url(#arrow)" />
  </svg>`;
  const box5CenterX = startX + boxW / 2 + 4 * (boxW + boxGap);
  const box3CenterX = startX + boxW / 2 + 2 * (boxW + boxGap);
  const loopW = box5CenterX - box3CenterX + 0.4;
  const loopX = box3CenterX - 0.2;
  const loopH = loopW * (60 / 400);
  const loopImg = await svgToBase64Png(loopSvg, 800, 120);
  const loopY = boxY + boxH + 0.06;
  s3.addImage({ data: loopImg, x: loopX, y: loopY, w: loopW, h: loopH });

  const captionY = loopY + loopH + 0.03;
  s3.addText("스케줄 조정에서 조건을 바꾸면 처리 중으로 돌아가 재계산", {
    x: 0.5, y: captionY, w: 9, h: 0.3,
    fontSize: 11, italic: true, color: COLOR.mutedOnLight,
    align: "center", fontFace: "HYSinMyeongJo-Medium", margin: 0,
  });

  s3.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.9, y: captionY + 0.38, w: 8.2, h: 0.5,
    fill: { color: COLOR.innerBeige }, rectRadius: 0.08,
  });
  s3.addText("개인별 데이터를 축적하여 더 정확한 모델로 점점 발전", {
    x: 0.9, y: captionY + 0.38, w: 8.2, h: 0.5,
    fontSize: 12, bold: true, color: COLOR.espresso,
    align: "center", valign: "middle", fontFace: "HYSinMyeongJo-Medium", margin: 0,
  });

  // Slides — 와이어프레임 (2장 + 3장)
  const wireframes = [
    {
      file: "home-screen.png", label: "① 홈",
      descHeader: "사용자가 처음으로 만나는 화면",
      descBody: "서비스 소개, 이전 계산 결과",
    },
    {
      file: "input-screen.png", label: "② 정보 입력",
      descHeader: "수면 패턴, 섭취 카페인 입력",
      descBody: "자연어로 추가 상황 설명 가능, 평소 취침 및 기상 시간, 시험 일시, 남은 공부 시간, 카페인 민감도, 수면압 등을 입력",
    },
    {
      file: "processing-screen.png", label: "③ 처리 중",
      descHeader: "계산 중 디스플레이",
      descBody: "계산 후 결과 화면으로 넘어감",
    },
    {
      file: "result-screen.png", label: "④ 결과",
      descHeader: "추천 취침 시간과 섭취 카페인량 추천",
      descBody: "그래프, 타임라인으로 표현된 시간대별 예측 각성도",
    },
    {
      file: "adjust-screen.png", label: "⑤ 스케줄 조정",
      descHeader: "세부적인 사항 변경 가능",
      descBody: "재계산을 통해 다시 결과 제공",
    },
  ];
  const imgRatio = 460 / 700;
  const screensDir = "../screens/";

  function addWireframeRow(pres, slide, items) {
    const n = items.length;
    const totalW = 8.2, gap = 0.2, startColX = 0.9;
    const colW = (totalW - gap * (n - 1)) / n;
    items.forEach((it, i) => {
      const cx = startColX + i * (colW + gap);
      slide.addText(it.label, {
        x: cx, y: 1.3, w: colW, h: 0.35,
        fontSize: 16, bold: true, color: COLOR.espresso,
        align: "center", fontFace: "HYSinMyeongJo-Medium", margin: 0,
      });
      const imgH = 2.2, imgW = imgH * imgRatio;
      slide.addImage({
        path: screensDir + it.file,
        x: cx + (colW - imgW) / 2, y: 1.68, w: imgW, h: imgH,
      });
      slide.addText(
        [
          { text: it.descHeader, options: { bold: true, breakLine: true } },
          { text: it.descBody, options: {} },
        ],
        {
          x: cx + 0.1, y: 3.96, w: colW - 0.2, h: 1.1,
          fontSize: 9.5, color: COLOR.mutedOnLight,
          align: "center", valign: "top", fontFace: "HYSinMyeongJo-Medium", margin: 0,
        }
      );
    });
  }

  let s5 = pres.addSlide();
  addContentFrame(pres, s5, "와이어프레임 · 홈 / 정보 입력");
  addWireframeRow(pres, s5, [wireframes[0], wireframes[1]]);

  let s6 = pres.addSlide();
  addContentFrame(pres, s6, "와이어프레임 · 처리 중 / 결과 / 스케줄 조정");
  addWireframeRow(pres, s6, [wireframes[2], wireframes[3], wireframes[4]]);

  // Slide 8 — 설계 과정 요약 (지금까지 + 앞으로)
  let s8 = pres.addSlide();
  addContentFrame(pres, s8, "설계 과정 요약");

  const checkIcon = await iconToBase64Png(FaCheck, "#" + COLOR.white, 300);

  s8.addText("지금까지 — 기획 완료", {
    x: 0.9, y: 1.35, w: 7.6, h: 0.3,
    fontSize: 13, bold: true, color: COLOR.caramel,
    align: "left", fontFace: "HYSinMyeongJo-Medium", margin: 0,
  });

  const doneSteps = [
    { title: "아이디어 검증", desc: "실현 가능성과 차별성을 기준으로한 구현 가능성 확인" },
    { title: "전공 지식 기반 설계", desc: "수면 과학 논문을 계산 근거로" },
    { title: "시나리오·기획서 완성", desc: "사용자 흐름 중심으로 화면 시각화" },
  ];
  const dW = 2.33, dGap = 0.3, dY = 1.7, dH = 1.05;
  doneSteps.forEach((st, i) => {
    const dx = 0.9 + i * (dW + dGap);
    s8.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: dx, y: dY, w: dW, h: dH,
      fill: { color: COLOR.innerBeige }, rectRadius: 0.08,
    });
    s8.addShape(pres.shapes.OVAL, { x: dx + 0.15, y: dY + 0.15, w: 0.32, h: 0.32, fill: { color: COLOR.caramel } });
    s8.addImage({ data: checkIcon, x: dx + 0.22, y: dY + 0.22, w: 0.18, h: 0.18 });
    s8.addText(st.title, {
      x: dx + 0.5, y: dY + 0.12, w: dW - 0.55, h: 0.4,
      fontSize: 11, bold: true, color: COLOR.espresso,
      align: "left", fontFace: "HYSinMyeongJo-Medium", margin: 0,
    });
    s8.addText(st.desc, {
      x: dx + 0.15, y: dY + 0.55, w: dW - 0.3, h: 0.45,
      fontSize: 9.5, color: COLOR.mutedOnLight,
      align: "left", fontFace: "HYSinMyeongJo-Medium", margin: 0,
    });
    if (i < doneSteps.length - 1) {
      s8.addShape(pres.shapes.LINE, {
        x: dx + dW, y: dY + dH / 2, w: dGap, h: 0,
        line: { color: COLOR.caramel, width: 1.5, endArrowType: "triangle" },
      });
    }
  });

  s8.addText("앞으로 — 4주 개발 계획", {
    x: 0.9, y: 2.95, w: 7.6, h: 0.3,
    fontSize: 13, bold: true, color: COLOR.mutedOnLight,
    align: "left", fontFace: "HYSinMyeongJo-Medium", margin: 0,
  });

  const nextSteps = [
    { title: "1주차", desc: ["아이디어 구상", "및 기획"] },
    { title: "2주차", desc: ["계산 엔진 구현"] },
    { title: "3주차", desc: ["화면 개발 +", "시각화 연동"] },
    { title: "4주차", desc: ["추가 기능 구현 +", "테스트·마무리"] },
  ];
  const nW = 1.71, nGap = 0.25, nY = 3.3, nH = 1.35;
  nextSteps.forEach((st, i) => {
    const nx = 0.9 + i * (nW + nGap);
    s8.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: nx, y: nY, w: nW, h: nH,
      fill: { color: COLOR.white }, rectRadius: 0.08,
      line: { color: COLOR.creamMuted, width: 1, dashType: "dash" },
    });
    s8.addText(st.title, {
      x: nx, y: nY + 0.15, w: nW, h: 0.35,
      fontSize: 13, bold: true, color: COLOR.espresso,
      align: "center", fontFace: "HYSinMyeongJo-Medium", margin: 0,
    });
    s8.addText(multiLine(st.desc), {
      x: nx + 0.1, y: nY + 0.58, w: nW - 0.2, h: 0.7,
      fontSize: 9.5, color: COLOR.mutedOnLight,
      align: "center", fontFace: "HYSinMyeongJo-Medium", margin: 0,
    });
    if (i < nextSteps.length - 1) {
      s8.addShape(pres.shapes.LINE, {
        x: nx + nW, y: nY + nH / 2, w: nGap, h: 0,
        line: { color: COLOR.mutedOnLight, width: 1.5, dashType: "dash", endArrowType: "triangle" },
      });
    }
  });

  // Slide 9 — 향후 고려 기능
  let s9 = pres.addSlide();
  addContentFrame(pres, s9, "향후 고려 기능");

  const scenarioIcon = await iconToBase64Png(FaBalanceScale, "#" + COLOR.caramel, 300);
  const calendarIcon = await iconToBase64Png(FaCalendarAlt, "#" + COLOR.caramel, 300);
  const personIcon = await iconToBase64Png(FaUser, "#" + COLOR.caramel, 300);

  const futureIdeas = [
    {
      title: "시나리오 비교",
      icon: scenarioIcon,
      desc: ["공부·수면 시간 조합별", "각성도 차이를 비교해서", "보여줌"],
      reason: ["이유: 기존 계산 엔진 재사용 가능,", "여유 있으면 추가"],
    },
    {
      title: "공부 기록 캘린더",
      icon: calendarIcon,
      desc: [
        "공부 시간을 기록하고,",
        "수면압·카페인을 고려해",
        "최적 시작 시각 추천",
        "(예: \"내일 오전 10시부터",
        "시작하면 최상의 컨디션\")",
      ],
      reason: ["이유: 캘린더·기록 저장 등 별도", "데이터 구조가 필요해 범위 밖"],
    },
    {
      title: "개인화 모델",
      icon: personIcon,
      desc: ["약 6개월 데이터가 쌓이면", "집단 평균이 아닌 개인별", "수면리듬·카페인 민감도로", "보정"],
      reason: ["이유: 아직 데이터가 없어 불가능,", "그 전까진 정확도 저하 경고 필요"],
    },
  ];

  function multiLine(lines) {
    return lines.map((line, idx) => ({
      text: line,
      options: idx < lines.length - 1 ? { breakLine: true } : {},
    }));
  }

  const fW = 2.333, fGap = 0.3, fY = 1.5, fH = 3.35;
  futureIdeas.forEach((idea, i) => {
    const fx = 0.9 + i * (fW + fGap);
    s9.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: fx, y: fY, w: fW, h: fH,
      fill: { color: COLOR.innerBeige }, rectRadius: 0.1,
    });
    s9.addShape(pres.shapes.OVAL, {
      x: fx + (fW - 0.55) / 2, y: fY + 0.22, w: 0.55, h: 0.55,
      fill: { color: COLOR.white }, line: { color: COLOR.caramel, width: 1.5 },
    });
    s9.addImage({ data: idea.icon, x: fx + (fW - 0.3) / 2, y: fY + 0.35, w: 0.3, h: 0.3 });
    s9.addText(idea.title, {
      x: fx, y: fY + 0.95, w: fW, h: 0.35,
      fontSize: 13, bold: true, color: COLOR.espresso,
      align: "center", fontFace: "HYSinMyeongJo-Medium", margin: 0,
    });
    s9.addText(multiLine(idea.desc), {
      x: fx + 0.2, y: fY + 1.4, w: fW - 0.4, h: 1.3,
      fontSize: 10, color: COLOR.espresso,
      align: "left", valign: "top", fontFace: "HYSinMyeongJo-Medium", margin: 0,
    });
    s9.addText(multiLine(idea.reason), {
      x: fx + 0.2, y: fY + fH - 0.75, w: fW - 0.4, h: 0.65,
      fontSize: 8.5, italic: true, color: COLOR.mutedOnLight,
      align: "left", valign: "top", fontFace: "HYSinMyeongJo-Medium", margin: 0,
    });
  });

  await pres.writeFile({ fileName: "기획서.pptx" });
  console.log("done");
}

build();
