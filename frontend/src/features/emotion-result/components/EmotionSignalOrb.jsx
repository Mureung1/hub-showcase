import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import createGlobe from "cobe";
import { emotionDefinitions } from "../../../shared/constants/emotionDefinitions";

const signalVisuals = {
  anxiety: {
    location: [37.5, 127],
    color: [0.6, 0.38, 0.88],
    baseColor: [0.36, 0.4, 0.87]
  },
  sadness: {
    location: [52.5, 13.4],
    color: [0.36, 0.68, 0.94],
    baseColor: [0.32, 0.48, 0.84]
  },
  anger: {
    location: [-23.5, -46.6],
    color: [0.9, 0.4, 0.45],
    baseColor: [0.78, 0.34, 0.45]
  },
  joy: {
    location: [-33.8, 151.2],
    color: [0.95, 0.7, 0.36],
    baseColor: [0.42, 0.55, 0.88]
  },
  neutral: {
    location: [25.2, 55.2],
    color: [0.46, 0.76, 0.91],
    baseColor: [0.42, 0.48, 0.82]
  }
};

function normalizeSignals(result) {
  return (Array.isArray(result?.scores) ? result.scores : [])
    .map((signal) => ({
      key: signal.key,
      label:
        signal.label ||
        emotionDefinitions[signal.key]?.label ||
        signal.key ||
        "감정 신호",
      score: Math.max(0, Math.min(100, Number(signal.score) || 0))
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function EmotionSignalOrb({ result, loading = false }) {
  const canvasRef = useRef(null);
  const globeRef = useRef(null);
  const pointerRef = useRef(null);
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const dragRef = useRef({ phi: 0, theta: 0 });
  const pausedRef = useRef(false);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const signals = useMemo(() => normalizeSignals(result), [result]);
  const dominantKey = signals[0]?.key || "neutral";
  const dominantVisual = signalVisuals[dominantKey] || signalVisuals.neutral;
  const markers = useMemo(
    () =>
      signals.map((signal) => {
        const visual = signalVisuals[signal.key] || signalVisuals.neutral;
        return {
          location: visual.location,
          size: 0.045 + signal.score / 2500,
          color: visual.color
        };
      }),
    [signals]
  );

  const finishPointerInteraction = useCallback((event) => {
    if (pointerRef.current === null) return;
    phiOffsetRef.current += dragRef.current.phi;
    thetaOffsetRef.current = Math.max(
      -0.45,
      Math.min(0.45, thetaOffsetRef.current + dragRef.current.theta)
    );
    dragRef.current = { phi: 0, theta: 0 };
    pointerRef.current = null;
    pausedRef.current = false;
    event?.currentTarget?.releasePointerCapture?.(event.pointerId);
  }, []);

  const handlePointerDown = useCallback((event) => {
    pointerRef.current = { x: event.clientX, y: event.clientY };
    pausedRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event) => {
    if (pointerRef.current === null) return;
    dragRef.current = {
      phi: (event.clientX - pointerRef.current.x) / 260,
      theta: Math.max(
        -0.35,
        Math.min(0.35, (event.clientY - pointerRef.current.y) / 700)
      )
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let animationFrame = 0;
    let fadeTimeout = 0;
    let phi = 0;
    let destroyed = false;
    const reducedMotion = prefersReducedMotion();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const renderFrame = () => {
      if (!globeRef.current || destroyed) return;
      if (!pausedRef.current && !reducedMotion) {
        phi += loading ? 0.006 : 0.0022;
      }
      globeRef.current.update({
        phi: phi + phiOffsetRef.current + dragRef.current.phi,
        theta: 0.18 + thetaOffsetRef.current + dragRef.current.theta
      });
      animationFrame = window.requestAnimationFrame(renderFrame);
    };

    const initialize = (cssWidth) => {
      if (globeRef.current || cssWidth <= 0 || destroyed) return;
      const size = Math.max(1, Math.round(cssWidth * dpr));

      try {
        globeRef.current = createGlobe(canvas, {
          devicePixelRatio: dpr,
          width: size,
          height: size,
          phi: 0,
          theta: 0.18,
          dark: 0,
          diffuse: 1.45,
          mapSamples: 16000,
          mapBrightness: 8,
          baseColor: dominantVisual.baseColor,
          markerColor: [0.44, 0.48, 0.9],
          glowColor: [0.96, 0.95, 0.93],
          markerElevation: 0.025,
          markers,
          arcs: [],
          arcColor: [0.4, 0.45, 0.85],
          arcWidth: 0.5,
          arcHeight: 0.2,
          opacity: 0.94
        });
        animationFrame = window.requestAnimationFrame(renderFrame);
        fadeTimeout = window.setTimeout(() => {
          if (!destroyed) canvas.dataset.ready = "true";
        }, 80);
      } catch {
        setCanvasFailed(true);
      }
    };

    const ResizeObserverImplementation = globalThis.ResizeObserver;
    const resizeObserver =
      typeof ResizeObserverImplementation === "function"
        ? new ResizeObserverImplementation((entries) => {
            const cssWidth =
              entries[0]?.contentRect.width || canvas.offsetWidth;
            if (!globeRef.current) {
              initialize(cssWidth);
              return;
            }
            const size = Math.max(1, Math.round(cssWidth * dpr));
            globeRef.current.update({ width: size, height: size });
          })
        : null;

    resizeObserver?.observe(canvas);
    initialize(canvas.offsetWidth || 320);

    return () => {
      destroyed = true;
      resizeObserver?.disconnect();
      window.clearTimeout(fadeTimeout);
      window.cancelAnimationFrame(animationFrame);
      globeRef.current?.destroy();
      globeRef.current = null;
      pointerRef.current = null;
      pausedRef.current = false;
    };
  }, [dominantVisual.baseColor, loading, markers]);

  return (
    <div
      className={`emotion-orb emotion-orb--${dominantKey} ${
        loading ? "emotion-orb--loading" : ""
      } ${canvasFailed ? "emotion-orb--fallback" : ""}`}
      role="img"
      aria-label={
        signals.length
          ? `상위 감정 신호 참고값: ${signals
              .map((signal) => `${signal.label} ${Math.round(signal.score)}%`)
              .join(", ")}. 마우스나 손가락으로 지구본을 회전할 수 있습니다.`
          : "분석을 기다리는 감정 신호 지구본"
      }
    >
      <div className="emotion-orb__halo" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className="emotion-orb__canvas"
        aria-hidden="true"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerInteraction}
        onPointerCancel={finishPointerInteraction}
      />
      {canvasFailed && <span className="emotion-orb__fallback-sphere" aria-hidden="true" />}
      <span className="emotion-orb__shadow" aria-hidden="true" />
    </div>
  );
}
