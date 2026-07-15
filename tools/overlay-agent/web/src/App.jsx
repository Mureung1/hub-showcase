import { useEffect, useMemo, useRef, useState } from "react";
import { analyzePhotoLayout, LayoutAnalysisError, withAdjustments } from "./features/vision-overlay";

const emptyMessage = "사진을 선택한 뒤 AI 레이아웃 생성을 시작하세요.";

function drawText(context, text, x, y, color, fontSize) {
  context.font = `700 ${fontSize}px Arial, Malgun Gothic, sans-serif`;
  context.fillStyle = color;
  context.fillText(text, x, y);
}

function drawRoundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function drawOverlay(context, guide, width, height, opacity) {
  const unit = Math.min(width, height);
  const strokeWidth = Math.max(2, Math.round(unit * 0.006));
  const fontSize = Math.max(14, Math.round(unit * 0.03));
  context.save();
  context.globalAlpha = opacity / 100;
  context.lineCap = "round";
  context.lineJoin = "round";

  context.strokeStyle = "#d9fff3";
  context.lineWidth = strokeWidth;
  guide.backgroundLines.forEach((line) => {
    context.beginPath();
    context.moveTo(line.start[0] * width, line.start[1] * height);
    context.lineTo(line.end[0] * width, line.end[1] * height);
    context.stroke();
  });
  if (guide.backgroundLines.length) {
    drawText(context, "Background guide", guide.backgroundLines[0].start[0] * width, Math.max(fontSize, guide.backgroundLines[0].start[1] * height - fontSize), "#ffffff", fontSize);
  }

  const horizonY = guide.horizonY * height;
  context.strokeStyle = "#ffffff";
  context.lineWidth = Math.max(1, strokeWidth - 1);
  context.setLineDash([strokeWidth * 4, strokeWidth * 3]);
  context.beginPath();
  context.moveTo(0, horizonY);
  context.lineTo(width, horizonY);
  context.stroke();
  context.setLineDash([]);
  drawText(context, "Horizon", width * 0.04, Math.max(fontSize, horizonY - fontSize), "#ffffff", Math.max(13, fontSize - 2));

  guide.personFrames.forEach((frame) => {
    const x = frame.x * width;
    const y = frame.y * height;
    const frameWidth = frame.width * width;
    const frameHeight = frame.height * height;
    context.strokeStyle = "#3dffae";
    context.lineWidth = strokeWidth;
    context.setLineDash([strokeWidth * 4, strokeWidth * 3]);
    drawRoundedRect(context, x, y, frameWidth, frameHeight, strokeWidth * 2);
    context.stroke();
    context.setLineDash([]);
    context.globalAlpha = opacity / 140;
    context.beginPath();
    context.moveTo(x + frameWidth / 2, y - strokeWidth * 4);
    context.lineTo(x + frameWidth / 2, y + frameHeight + strokeWidth * 4);
    context.stroke();
    context.globalAlpha = opacity / 100;
    drawText(context, frame.label, x, Math.max(fontSize, y - fontSize / 2), "#3dffae", fontSize);
  });
  context.restore();
}

function GuideCanvas({ image, guide, opacity, previewCanvasRef, overlayCanvasRef }) {
  useEffect(() => {
    if (!image || !guide) return;
    const preview = previewCanvasRef.current;
    const overlay = overlayCanvasRef.current;
    preview.width = image.naturalWidth;
    preview.height = image.naturalHeight;
    overlay.width = image.naturalWidth;
    overlay.height = image.naturalHeight;

    const previewContext = preview.getContext("2d");
    const overlayContext = overlay.getContext("2d");
    previewContext.clearRect(0, 0, preview.width, preview.height);
    previewContext.drawImage(image, 0, 0);
    previewContext.fillStyle = "rgba(16, 29, 21, 0.2)";
    previewContext.fillRect(0, 0, preview.width, preview.height);
    drawOverlay(previewContext, guide, preview.width, preview.height, opacity);

    overlayContext.clearRect(0, 0, overlay.width, overlay.height);
    drawOverlay(overlayContext, guide, overlay.width, overlay.height, opacity);
  }, [guide, image, opacity, overlayCanvasRef, previewCanvasRef]);

  return <canvas className="guide-canvas" ref={previewCanvasRef} aria-label="자동 생성된 레이아웃 가이드" />;
}

function AnalysisProgress({ phase, progressStep, message }) {
  const steps = ["모델 준비", "인물 감지", "배경 분석", "가이드 생성"];
  return (
    <section className={`analysis-progress ${phase === "error" ? "error" : ""}`} aria-live="polite">
      <div className="analysis-progress-head"><strong>{phase === "ready" ? "분석 완료" : phase === "loading" ? "분석 진행 중" : phase === "error" ? "분석 안내" : "가이드 구성"}</strong><span>{phase === "loading" ? `${progressStep}/4` : phase === "ready" ? "4/4" : ""}</span></div>
      <ol className="analysis-steps">
        {steps.map((step, index) => <li className={index + 1 < progressStep || phase === "ready" ? "done" : index + 1 === progressStep && phase === "loading" ? "active" : ""} key={step}>{step}</li>)}
      </ol>
      <p>{message}</p>
    </section>
  );
}

function App() {
  const inputRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const objectUrlRef = useRef(null);
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [fileName, setFileName] = useState("photo-overlay");
  const [mode, setMode] = useState("couple");
  const [baseGuide, setBaseGuide] = useState(null);
  const [frameScale, setFrameScale] = useState(100);
  const [horizon, setHorizon] = useState(62);
  const [opacity, setOpacity] = useState(88);
  const [phase, setPhase] = useState("idle");
  const [message, setMessage] = useState(emptyMessage);
  const [progressStep, setProgressStep] = useState(0);

  const guide = useMemo(() => {
    if (!baseGuide) return null;
    return withAdjustments(baseGuide, { frameScale, horizonPercent: horizon });
  }, [baseGuide, frameScale, horizon]);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  function chooseMode(nextMode) {
    setMode(nextMode);
    if (baseGuide) {
      setBaseGuide(null);
      setPhase("idle");
      setProgressStep(0);
      setMessage(`${nextMode === "solo" ? "1인" : "커플"} 모드로 변경했습니다. AI 레이아웃을 다시 생성하세요.`);
    }
  }

  function selectImage(file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhase("error");
      setMessage("JPG, PNG, WebP 사진만 분석할 수 있습니다.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setPhase("error");
      setMessage("12MB 이하의 사진을 선택하세요.");
      return;
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    const uploadedImage = new Image();
    uploadedImage.onload = () => {
      setImage(uploadedImage);
      setImageUrl(objectUrl);
      setFileName(file.name.replace(/\.[^/.]+$/, "") || "photo-overlay");
      setBaseGuide(null);
      setPhase("idle");
      setProgressStep(0);
      setMessage("사진을 준비했습니다. AI 레이아웃 생성을 시작하세요.");
    };
    uploadedImage.onerror = () => {
      setPhase("error");
      setMessage("사진을 읽지 못했습니다. 다른 파일을 선택하세요.");
    };
    uploadedImage.src = objectUrl;
  }

  async function analyze() {
    if (!image) {
      inputRef.current?.click();
      return;
    }
    try {
      setPhase("loading");
      setProgressStep(1);
      setMessage("로컬 Vision 모델을 준비하고 있습니다.");
      const { guide: nextGuide, warning } = await analyzePhotoLayout({
        image,
        mode,
        onProgress: (step, nextMessage) => {
          setProgressStep(step);
          setMessage(nextMessage);
        },
      });
      setBaseGuide(nextGuide);
      setFrameScale(100);
      setHorizon(Math.round(nextGuide.horizonY * 100));
      setPhase("ready");
      setProgressStep(4);
      setMessage(`로컬 분석 완료: ${mode === "solo" ? "인물 1명" : "인물 2명"}과 배경 구도 가이드를 생성했습니다.${warning ? ` ${warning}` : ""}`);
    } catch (error) {
      setBaseGuide(null);
      setPhase("error");
      setProgressStep(0);
      setMessage(error instanceof LayoutAnalysisError ? error.message : `분석을 시작하지 못했습니다. npm run setup-models를 실행했는지 확인하세요. (${error.message})`);
    }
  }

  function downloadOverlay() {
    const canvas = overlayCanvasRef.current;
    if (!canvas || !guide) return;
    const link = document.createElement("a");
    link.download = `${fileName}-overlay.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function downloadGuide() {
    if (!guide) return;
    const payload = { ...guide, renderOptions: { opacity } };
    const link = document.createElement("a");
    link.download = `${fileName}-guide.json`;
    link.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
  }

  const canDownload = phase === "ready" && Boolean(guide);
  const sourceMeta = image ? `${image.naturalWidth} × ${image.naturalHeight}` : "사진을 선택하세요";

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">P</div>
          <div>
            <p className="eyebrow">Photo Navigation · Local Vision Overlay Studio</p>
            <h1>사진 레이아웃 Agent</h1>
          </div>
        </div>
        <p className="status"><strong>100% 로컬 분석</strong> · 사진과 좌표는 브라우저 밖으로 전송되지 않습니다.</p>
      </header>

      <section className="workspace" aria-label="사진 레이아웃 작업 공간">
        <article className="panel">
          <div className="panel-head"><h2 className="panel-title">Before · 원본 사진</h2><span className="panel-kicker">{sourceMeta}</span></div>
          <div className="image-stage">
            {imageUrl ? <img className="preview-image" src={imageUrl} alt="업로드한 원본 사진" /> : <EmptyStage title="사진을 업로드하세요" text="JPG, PNG, WebP 사진을 넣으면 원본과 AI 가이드 결과를 나란히 확인할 수 있습니다." icon="▧" />}
          </div>
        </article>

        <aside className="panel controls-panel" aria-label="레이아웃 설정">
          <div className="panel-head"><h2 className="panel-title">레이아웃 설정</h2><span className="tag">{mode === "solo" ? "1인" : "커플"}</span></div>
          <div className="controls">
            <label className="file-button">사진 선택<input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectImage(event.target.files?.[0])} /></label>
            <ControlLabel title="프레임 구성" detail="인물 수" />
            <div className="segmented" role="group" aria-label="인물 프레임 선택">
              <button className={`segment ${mode === "solo" ? "active" : ""}`} onClick={() => chooseMode("solo")} type="button">1인</button>
              <button className={`segment ${mode === "couple" ? "active" : ""}`} onClick={() => chooseMode("couple")} type="button">커플</button>
            </div>
            <RangeControl title="인물 프레임 크기" displayValue={`${frameScale}%`} min="70" max="135" inputValue={frameScale} onChange={setFrameScale} disabled={!baseGuide} />
            <RangeControl title="수평 가이드" displayValue={`${horizon}%`} min="35" max="78" inputValue={horizon} onChange={setHorizon} disabled={!baseGuide} />
            <RangeControl title="Overlay 투명도" displayValue={`${opacity}%`} min="45" max="100" inputValue={opacity} onChange={setOpacity} disabled={!baseGuide} />
            <div className="workflow"><div><b>1</b>사진 선택</div><i>→</i><div><b>2</b>AI 분석</div><i>→</i><div><b>3</b>Overlay</div></div>
            <button className="action-button" onClick={analyze} type="button" disabled={phase === "loading"}>{phase === "loading" ? "AI 분석 중..." : baseGuide ? "AI 레이아웃 재분석" : "AI 레이아웃 생성"}</button>
            <button className="download-button" onClick={downloadOverlay} type="button" disabled={!canDownload}>Overlay PNG 다운로드</button>
            <button className="json-button" onClick={downloadGuide} type="button" disabled={!canDownload}>guide.json 다운로드</button>
            <AnalysisProgress phase={phase} progressStep={progressStep} message={message} />
          </div>
        </aside>

        <article className="panel after">
          <div className="panel-head"><h2 className="panel-title">After · AI 레이아웃 가이드</h2><span className="panel-kicker">{guide ? `${mode === "solo" ? "1인" : "커플"} · ${image.naturalWidth} × ${image.naturalHeight}` : "생성 전"}</span></div>
          <div className="image-stage">
            {image && guide ? <GuideCanvas image={image} guide={guide} opacity={opacity} previewCanvasRef={previewCanvasRef} overlayCanvasRef={overlayCanvasRef} /> : <EmptyStage title="촬영 가이드를 준비합니다" text="사진을 선택한 뒤 AI 레이아웃을 생성하면 인물과 배경 구도가 표시됩니다." icon="✦" />}
          </div>
          <div className="result-note"><strong>PNG 결과물</strong>은 원본 사진 위에 보이는 안내선만 포함하는 투명 이미지입니다.</div>
        </article>
      </section>
      <canvas className="hidden-canvas" ref={overlayCanvasRef} />
    </main>
  );
}

function EmptyStage({ title, text, icon }) {
  return <div className="empty"><div className="empty-icon">{icon}</div><h2>{title}</h2><p>{text}</p></div>;
}

function ControlLabel({ title, detail }) {
  return <div className="control-label">{title}<span>{detail}</span></div>;
}

function RangeControl({ title, displayValue, min, max, inputValue, onChange, disabled }) {
  return <div className="control-group"><ControlLabel title={title} detail={displayValue} /><input type="range" min={min} max={max} value={inputValue} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} /></div>;
}

export default App;
