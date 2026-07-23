import { useEffect, useRef, useState } from "react";
import { MAX_BACKGROUND_LINES, createBackgroundLine, removeMostRecentLine } from "./lib/backgroundGuides";

const imageUrl = (photoId) => `/api/layout-assets/image?photo_id=${encodeURIComponent(photoId)}`;

function pointFromEvent(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
  };
}

function distanceToSegment(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = dx * dx + dy * dy;
  if (!length) return Math.hypot(point.x - start[0], point.y - start[1]);
  const t = Math.max(0, Math.min(1, ((point.x - start[0]) * dx + (point.y - start[1]) * dy) / length));
  return Math.hypot(point.x - (start[0] + t * dx), point.y - (start[1] + t * dy));
}

function drawCanvas(canvas, image, layout, lines, selectedLineId, draftStart, hoverPoint) {
  if (!canvas || !image || !layout) return;
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  const unit = Math.min(canvas.width, canvas.height);
  const stroke = Math.max(2, Math.round(unit * 0.006));
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.lineCap = "round";
  context.save();
  context.beginPath();
  context.rect(0, 0, canvas.width, canvas.height);
  layout.personOutlines?.forEach((outline) => outline.contours?.forEach((contour) => {
    if (contour.length < 3) return;
    context.moveTo(contour[0][0] * canvas.width, contour[0][1] * canvas.height);
    contour.slice(1).forEach(([x, y]) => context.lineTo(x * canvas.width, y * canvas.height));
    context.closePath();
  }));
  context.clip("evenodd");
  lines.forEach((line) => {
    const selected = line.id === selectedLineId;
    context.strokeStyle = selected ? "#ff2da6" : "#ffe94a";
    context.lineWidth = selected ? stroke + 2 : stroke;
    context.beginPath();
    context.moveTo(line.start[0] * canvas.width, line.start[1] * canvas.height);
    context.lineTo(line.end[0] * canvas.width, line.end[1] * canvas.height);
    context.stroke();
  });
  context.restore();
  const selectedLine = lines.find((line) => line.id === selectedLineId);
  if (selectedLine) {
    context.fillStyle = "#ff2da6";
    [selectedLine.start, selectedLine.end].forEach(([x, y]) => {
      context.beginPath();
      context.arc(x * canvas.width, y * canvas.height, Math.max(5, unit * .011), 0, Math.PI * 2);
      context.fill();
    });
  }

  if (draftStart) {
    context.strokeStyle = "#ff2da6";
    context.fillStyle = "#ff2da6";
    context.lineWidth = stroke;
    context.beginPath();
    context.arc(draftStart.x * canvas.width, draftStart.y * canvas.height, Math.max(6, unit * .013), 0, Math.PI * 2);
    context.fill();
    if (hoverPoint) {
      context.setLineDash([10, 8]);
      context.beginPath();
      context.moveTo(draftStart.x * canvas.width, draftStart.y * canvas.height);
      context.lineTo(hoverPoint.x * canvas.width, hoverPoint.y * canvas.height);
      context.stroke();
      context.setLineDash([]);
    }
  }

  layout.personOutlines?.forEach((outline) => outline.contours?.forEach((contour) => {
    if (contour.length < 3) return;
    context.strokeStyle = "#3dffae";
    context.lineWidth = stroke;
    context.beginPath();
    context.moveTo(contour[0][0] * canvas.width, contour[0][1] * canvas.height);
    contour.slice(1).forEach(([x, y]) => context.lineTo(x * canvas.width, y * canvas.height));
    context.closePath();
    context.stroke();
  }));
}

export default function BackgroundEditorApp() {
  const canvasRef = useRef(null);
  const [assets, setAssets] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [image, setImage] = useState(null);
  const [layout, setLayout] = useState(null);
  const [lines, setLines] = useState([]);
  const [selectedLineId, setSelectedLineId] = useState("");
  const [registration, setRegistration] = useState(false);
  const [draftStart, setDraftStart] = useState(null);
  const [hoverPoint, setHoverPoint] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("사진을 불러오는 중입니다.");

  const selectedAsset = assets.find((asset) => asset.photoId === selectedId);

  useEffect(() => {
    fetch("/api/layout-assets")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("목록을 읽지 못했습니다.")))
      .then((items) => {
        setAssets(items);
        setSelectedId(items[0]?.photoId ?? "");
      })
      .catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setMessage("레이아웃을 불러오는 중입니다.");
    setRegistration(false);
    setDraftStart(null);
    setHoverPoint(null);
    setDragging(null);
    setSelectedLineId("");
    setDirty(false);
    Promise.all([
      fetch(`/api/layout-assets/layout?photo_id=${encodeURIComponent(selectedId)}`).then((response) => response.ok ? response.json() : Promise.reject(new Error("layout JSON을 읽지 못했습니다."))),
      new Promise((resolve, reject) => {
        const nextImage = new Image();
        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () => reject(new Error("사진을 읽지 못했습니다."));
        nextImage.src = imageUrl(selectedId);
      }),
    ]).then(([nextLayout, nextImage]) => {
      setLayout(nextLayout);
      setLines(nextLayout.backgroundLines ?? []);
      setImage(nextImage);
      setMessage("저장된 레이아웃을 불러왔습니다.");
    }).catch((error) => setMessage(error.message));
  }, [selectedId]);

  useEffect(() => {
    drawCanvas(canvasRef.current, image, layout, lines, selectedLineId, draftStart, hoverPoint);
  }, [image, layout, lines, selectedLineId, draftStart, hoverPoint]);

  function beginRegistration() {
    if (!layout || lines.length >= MAX_BACKGROUND_LINES) return;
    setRegistration(true);
    setDraftStart(null);
    setMessage("선의 시작점을 클릭하세요.");
  }

  function changeLines(nextLines) {
    setLines(nextLines);
    setDirty(true);
  }

  function onPointerDown(event) {
    if (!layout) return;
    const point = pointFromEvent(event);
    if (registration) {
      if (!draftStart) {
        setDraftStart(point);
        setHoverPoint(point);
        setMessage("끝점을 클릭하세요.");
        return;
      }
      const line = createBackgroundLine(lines, draftStart, point);
      if (!line) {
        setMessage("시작점에서 충분히 떨어진 끝점을 선택하세요.");
        return;
      }
      changeLines([...lines, line]);
      setSelectedLineId(line.id);
      setDraftStart(null);
      setHoverPoint(null);
      setRegistration(false);
      setMessage("배경선을 등록했습니다. 저장하면 layout JSON에 반영됩니다.");
      return;
    }
    const endpoint = lines.flatMap((line) => [[line.id, "start", line.start], [line.id, "end", line.end]])
      .find(([, , candidate]) => Math.hypot(point.x - candidate[0], point.y - candidate[1]) < .028);
    if (endpoint) {
      setSelectedLineId(endpoint[0]);
      setDragging({ lineId: endpoint[0], endpoint: endpoint[1] });
      event.currentTarget.setPointerCapture?.(event.pointerId);
      return;
    }
    const matchingLine = lines.find((line) => distanceToSegment(point, line.start, line.end) < .018);
    setSelectedLineId(matchingLine?.id ?? "");
  }

  function onPointerMove(event) {
    const point = pointFromEvent(event);
    if (registration) setHoverPoint(point);
    if (!dragging) return;
    changeLines(lines.map((line) => line.id === dragging.lineId ? { ...line, [dragging.endpoint]: [Number(point.x.toFixed(6)), Number(point.y.toFixed(6))] } : line));
  }

  function undo() {
    if (draftStart) {
      setDraftStart(null);
      setHoverPoint(null);
      setMessage("시작점 선택을 취소했습니다.");
      return;
    }
    if (!lines.length) return;
    changeLines(removeMostRecentLine(lines));
    setSelectedLineId("");
  }

  function deleteSelected() {
    if (!selectedLineId) return;
    changeLines(lines.filter((line) => line.id !== selectedLineId));
    setSelectedLineId("");
  }

  async function save() {
    if (!selectedId || !dirty) return;
    setMessage("layout JSON과 overlay PNG를 저장하고 있습니다.");
    const response = await fetch(`/api/layout-assets/layout?photo_id=${encodeURIComponent(selectedId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backgroundLines: lines }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.detail || "저장하지 못했습니다.");
      return;
    }
    setLayout(result.layout);
    setLines(result.layout.backgroundLines ?? []);
    setDirty(false);
    setMessage("저장했습니다. 같은 ID의 layout JSON과 overlay PNG를 덮어썼습니다.");
  }

  return <main className="editor-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark">P</div><div><p className="eyebrow">Photo Navigation · Local Admin Tool</p><h1>배경선 편집</h1></div></div><a className="top-link" href={`${import.meta.env.BASE_URL}`}>레이아웃 등록으로</a></header>
    <section className="editor-workspace">
      <aside className="editor-list"><h2>사진 30장</h2><p>기준 프레임과 비교용 사진을 선택합니다.</p>{assets.map((asset) => <button className={`asset-item ${asset.photoId === selectedId ? "active" : ""}`} key={asset.photoId} type="button" onClick={() => setSelectedId(asset.photoId)}><img src={imageUrl(asset.photoId)} alt="" /><span><b>{asset.placeId}</b><small>{asset.mode} · pose {asset.poseId} · {asset.variant === "reference" ? "기준" : "비교"}</small></span></button>)}</aside>
      <section className="editor-stage"><div className="editor-stage-head"><div><p className="eyebrow">{selectedAsset?.photoId || "선택 전"}</p><h2>{selectedAsset?.title || "사진 선택"}</h2></div><span className={dirty ? "dirty" : "saved"}>{dirty ? "저장되지 않은 변경" : "저장됨"}</span></div><div className="editor-canvas-wrap">{image && <div className="editor-artboard"><img src={imageUrl(selectedId)} alt={`${selectedAsset?.title || "선택한 사진"} 원본`} /><canvas ref={canvasRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => setDragging(null)} onPointerLeave={() => { setHoverPoint(null); setDragging(null); }} /></div>}</div></section>
      <aside className="editor-controls"><h2>선택 편집</h2><p className="editor-message">{message}</p><div className="editor-actions"><button type="button" onClick={beginRegistration} disabled={!layout || registration || lines.length >= MAX_BACKGROUND_LINES}>선 등록</button><button type="button" onClick={undo} disabled={!draftStart && !lines.length}>되돌리기</button><button type="button" onClick={deleteSelected} disabled={!selectedLineId}>선 삭제</button></div><div className="line-list"><div className="control-label">등록선 <span>{lines.length} / {MAX_BACKGROUND_LINES}</span></div>{lines.length ? lines.map((line, index) => <button type="button" key={line.id} className={line.id === selectedLineId ? "selected" : ""} onClick={() => setSelectedLineId(line.id)}><b>{index + 1}</b><span>{line.id}</span></button>) : <p>등록된 배경선이 없습니다.</p>}</div><button className="editor-save" type="button" onClick={save} disabled={!dirty}>저장</button><p className="editor-hint">선 끝의 분홍 점을 드래그하면 기존 선을 수정할 수 있습니다.</p></aside>
    </section>
  </main>;
}
