import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Screen = "map" | "frames" | "camera" | "result";
type Point = { x: number; y: number };

type PhotoSpot = {
  id: string;
  name: string;
  place: string;
  distance: string;
  walk: string;
  tags: string[];
  x: number;
  y: number;
};

type ShotFrame = {
  id: string;
  title: string;
  subtitle: string;
  tags: string[];
  guide: string;
  tone: "green" | "blue" | "yellow" | "red";
};

const photoSpots: PhotoSpot[] = [
  {
    id: "daegu-lawn",
    name: "잔디광장 커플샷",
    place: "대구 야외음악당",
    distance: "120m",
    walk: "도보 2분",
    tags: ["커플 추천", "초보", "무대 배경"],
    x: 46,
    y: 57,
  },
  {
    id: "freedom-plaza",
    name: "광장 전신샷",
    place: "2.28 자유광장",
    distance: "240m",
    walk: "도보 4분",
    tags: ["전신샷", "넓은 배경"],
    x: 57,
    y: 34,
  },
  {
    id: "arts-center",
    name: "문화예술회관 산책샷",
    place: "대구문화예술회관",
    distance: "310m",
    walk: "도보 5분",
    tags: ["산책", "건물 배경"],
    x: 50,
    y: 76,
  },
];

const shotFrames: ShotFrame[] = [
  {
    id: "couple-stage",
    title: "무대 배경 투샷",
    subtitle: "무대 지붕선 + 브이 포즈",
    tags: ["추천", "커플", "쉬움"],
    guide: "무대 지붕선을 상단 윤곽선에 맞추고 두 사람의 얼굴을 원형 가이드 안에 맞춰보세요.",
    tone: "green",
  },
  {
    id: "selfie-v",
    title: "브이 셀카",
    subtitle: "얼굴 중심 + 배경 살짝",
    tags: ["셀카", "초보"],
    guide: "두 얼굴을 화면 중앙보다 살짝 위에 두고 배경 무대가 뒤에 걸리게 맞춰보세요.",
    tone: "blue",
  },
  {
    id: "full-body",
    title: "손잡고 전신",
    subtitle: "잔디광장 중앙 구도",
    tags: ["전신", "넓게"],
    guide: "인물을 하단 1/3에 두고 뒤쪽 무대가 화면 중앙에 들어오게 해보세요.",
    tone: "yellow",
  },
  {
    id: "sunset",
    title: "노을 실루엣",
    subtitle: "해질녘 감성 구도",
    tags: ["노을", "분위기"],
    guide: "하늘 비율을 넓게 잡고 인물은 어둡게 실루엣으로 남기는 프레임입니다.",
    tone: "red",
  },
];

function App() {
  const [screen, setScreen] = useState<Screen>("map");
  const [selectedSpot, setSelectedSpot] = useState<PhotoSpot>(photoSpots[0]);
  const [selectedFrame, setSelectedFrame] = useState<ShotFrame>(shotFrames[0]);
  const [captureUrl, setCaptureUrl] = useState<string>("");

  const goFrames = () => setScreen("frames");
  const goCamera = (frame: ShotFrame) => {
    setSelectedFrame(frame);
    setScreen("camera");
  };
  const goResult = (url: string) => {
    setCaptureUrl(url);
    setScreen("result");
  };

  return (
    <main className="app-shell">
      {screen === "map" && (
        <MapScreen
          selectedSpot={selectedSpot}
          onSelectSpot={setSelectedSpot}
          onChooseFrame={goFrames}
        />
      )}
      {screen === "frames" && (
        <FrameSelectScreen
          spot={selectedSpot}
          selectedFrame={selectedFrame}
          onBack={() => setScreen("map")}
          onSelectFrame={goCamera}
        />
      )}
      {screen === "camera" && (
        <CameraOverlayScreen
          frame={selectedFrame}
          onBack={() => setScreen("frames")}
          onCapture={goResult}
        />
      )}
      {screen === "result" && (
        <ResultScreen
          spot={selectedSpot}
          frame={selectedFrame}
          captureUrl={captureUrl}
          onRetake={() => setScreen("camera")}
          onMap={() => setScreen("map")}
        />
      )}
    </main>
  );
}

function MapScreen({
  selectedSpot,
  onSelectSpot,
  onChooseFrame,
}: {
  selectedSpot: PhotoSpot;
  onSelectSpot: (spot: PhotoSpot) => void;
  onChooseFrame: () => void;
}) {
  const [mapOffset, setMapOffset] = useState<Point>({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragOrigin, setDragOrigin] = useState<Point>({ x: 0, y: 0 });
  const [dragDistance, setDragDistance] = useState(0);

  const clampOffset = (point: Point): Point => ({
    x: Math.max(-92, Math.min(92, point.x)),
    y: Math.max(-112, Math.min(72, point.y)),
  });

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    setDragStart({ x: event.clientX, y: event.clientY });
    setDragOrigin(mapOffset);
    setDragDistance(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveMap = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    setDragDistance(Math.hypot(dx, dy));
    setMapOffset(clampOffset({ x: dragOrigin.x + dx, y: dragOrigin.y + dy }));
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    setDragStart(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <section className="phone-stage">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Photo Navigation</p>
          <h1>포토스팟을 고르고 같은 구도로 찍어요</h1>
        </div>
        <button
          className="circle-button"
          type="button"
          aria-label="지도 위치 초기화"
          onClick={() => setMapOffset({ x: 0, y: 0 })}
        >
          ◎
        </button>
      </header>

      <div
        className={`mock-map ${dragStart ? "dragging" : ""}`}
        aria-label="네이버 지도 목업"
        onPointerDown={startDrag}
        onPointerMove={moveMap}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="map-canvas"
          style={{ transform: `translate3d(${mapOffset.x}px, ${mapOffset.y}px, 0)` }}
        >
          <div className="road road-a" />
          <div className="road road-b" />
          <div className="road road-c" />
          <span className="map-text park">두류공원</span>
          <span className="map-text plaza">2.28 자유광장</span>
          <span className="map-text music">대구 야외음악당</span>
          <span className="current-dot" />
          {photoSpots.map((spot) => (
            <button
              key={spot.id}
              type="button"
              className={`map-pin ${spot.id === selectedSpot.id ? "active" : ""}`}
              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                if (dragDistance < 8) onSelectSpot(spot);
              }}
              aria-label={`${spot.place} ${spot.name}`}
            >
              <span>⌾</span>
            </button>
          ))}
        </div>
        <div className="map-hint">지도를 잡고 움직여보세요</div>
      </div>

      <aside className="bottom-sheet">
        <div className="spot-thumb">
          <div className="mini-stage" />
          <div className="mini-people" />
        </div>
        <div className="spot-copy">
          <p className="spot-place">{selectedSpot.place}</p>
          <h2>{selectedSpot.name}</h2>
          <p className="muted">
            {selectedSpot.distance} · {selectedSpot.walk}
          </p>
          <div className="chip-row">
            {selectedSpot.tags.map((tag) => (
              <span className="chip" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        <button className="primary-button full" type="button" onClick={onChooseFrame}>
          프레임 고르기
        </button>
      </aside>
    </section>
  );
}

function FrameSelectScreen({
  spot,
  selectedFrame,
  onBack,
  onSelectFrame,
}: {
  spot: PhotoSpot;
  selectedFrame: ShotFrame;
  onBack: () => void;
  onSelectFrame: (frame: ShotFrame) => void;
}) {
  return (
    <section className="phone-stage panel-stage">
      <Header title="커플 프레임 선택" subtitle={spot.place} onBack={onBack} />
      <div className="frame-grid">
        {shotFrames.map((frame) => (
          <button
            key={frame.id}
            type="button"
            className={`frame-card ${frame.tone} ${
              selectedFrame.id === frame.id ? "selected" : ""
            }`}
            onClick={() => onSelectFrame(frame)}
          >
            <div className="frame-preview">
              <div className="preview-stage" />
              <div className="preview-person one" />
              <div className="preview-person two" />
            </div>
            <div className="frame-copy">
              <h2>{frame.title}</h2>
              <p>{frame.subtitle}</p>
              <div className="chip-row">
                {frame.tags.map((tag) => (
                  <span className="chip" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function CameraOverlayScreen({
  frame,
  onBack,
  onCapture,
}: {
  frame: ShotFrame;
  onBack: () => void;
  onCapture: (url: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraState, setCameraState] = useState<"loading" | "ready" | "blocked">("loading");
  const [opacity, setOpacity] = useState(76);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraState("ready");
      } catch {
        setCameraState("blocked");
      }
    }

    if (navigator.mediaDevices?.getUserMedia) {
      startCamera();
    } else {
      setCameraState("blocked");
    }

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = video?.videoWidth || 900;
    const height = video?.videoHeight || 1200;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;

    if (video && cameraState === "ready") {
      context.drawImage(video, 0, 0, width, height);
    } else {
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#b9d7ec");
      gradient.addColorStop(0.45, "#e9f4ff");
      gradient.addColorStop(0.46, "#8dbb70");
      gradient.addColorStop(1, "#4d7d4f");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    }

    onCapture(canvas.toDataURL("image/png"));
  };

  return (
    <section className="camera-stage">
      <div className="camera-toolbar">
        <button className="ghost-button" type="button" onClick={onBack}>
          뒤로
        </button>
        <div>
          <p className="eyebrow light">오버레이 촬영</p>
          <h1>{frame.title}</h1>
        </div>
        <span className="status-pill">{cameraState === "ready" ? "Camera" : "Mock"}</span>
      </div>

      <div className="camera-view">
        <video ref={videoRef} className="camera-video" playsInline muted />
        {cameraState !== "ready" && (
          <div className="camera-fallback">
            <div className="fallback-sky" />
            <div className="fallback-ground" />
            <p>{cameraState === "loading" ? "카메라 준비 중" : "카메라 권한이 필요해요"}</p>
          </div>
        )}

        <div className="overlay-layer" style={{ opacity: opacity / 100 }}>
          <div className="stage-outline">
            <span />
            <span />
          </div>
          <div className="face-guide face-left" />
          <div className="face-guide face-right" />
          <div className="body-guide body-left" />
          <div className="body-guide body-right" />
          <div className="center-line" />
        </div>
      </div>

      <div className="camera-controls">
        <p>{frame.guide}</p>
        <label className="slider-row">
          Overlay
          <input
            type="range"
            min="35"
            max="95"
            value={opacity}
            onChange={(event) => setOpacity(Number(event.target.value))}
          />
          <span>{opacity}%</span>
        </label>
        <button className="shutter-button" type="button" onClick={capture}>
          촬영
        </button>
      </div>
      <canvas ref={canvasRef} hidden />
    </section>
  );
}

function ResultScreen({
  spot,
  frame,
  captureUrl,
  onRetake,
  onMap,
}: {
  spot: PhotoSpot;
  frame: ShotFrame;
  captureUrl: string;
  onRetake: () => void;
  onMap: () => void;
}) {
  const feedback = useMemo(
    () => ["배경 윤곽이 잘 맞았어요", "얼굴 위치가 가이드에 가까워요", "조금 더 가까이 찍으면 좋아요"],
    []
  );

  return (
    <section className="phone-stage panel-stage">
      <Header title="촬영 결과" subtitle={`${spot.place} · ${frame.title}`} onBack={onRetake} />
      <div className="result-compare">
        <article>
          <span>예시</span>
          <div className="sample-photo">
            <div className="preview-stage" />
            <div className="preview-person one" />
            <div className="preview-person two" />
          </div>
        </article>
        <article>
          <span>내 사진</span>
          {captureUrl ? (
            <img src={captureUrl} alt="촬영 결과" />
          ) : (
            <div className="sample-photo" />
          )}
        </article>
      </div>

      <div className="score-card">
        <p>유사도</p>
        <strong>84점</strong>
        <span>오버레이 기준에 가깝게 촬영됐어요.</span>
      </div>

      <div className="feedback-list">
        {feedback.map((item) => (
          <div key={item} className="feedback-item">
            <span>✓</span>
            {item}
          </div>
        ))}
      </div>

      <div className="action-row">
        <button className="secondary-button" type="button" onClick={onRetake}>
          다시 찍기
        </button>
        <button className="primary-button" type="button" onClick={onMap}>
          지도 보기
        </button>
      </div>
    </section>
  );
}

function Header({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}) {
  return (
    <header className="screen-header">
      <button className="circle-button" type="button" onClick={onBack} aria-label="뒤로">
        ‹
      </button>
      <div>
        <p className="eyebrow">{subtitle}</p>
        <h1>{title}</h1>
      </div>
    </header>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
