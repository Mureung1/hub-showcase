import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { SpriteAnimationAsset, SpritePlaybackFrame } from "../data/assetManifest";

interface CanvasSpriteAnimatorProps {
  animation: SpriteAnimationAsset;
  className?: string;
  ariaLabel: string;
  forceMotion?: boolean;
  mirrorX?: boolean;
}

function getReducedMotionPreference() {
  if (typeof window === "undefined" || !("matchMedia" in window)) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getPlaybackSequence(animation: SpriteAnimationAsset): SpritePlaybackFrame[] {
  const sourceFrames: SpritePlaybackFrame[] =
    animation.playbackFrames ?? Array.from({ length: animation.frameCount }, (_, frame) => ({ frame }));

  return sourceFrames.flatMap((step) => {
    const hold = Math.max(1, step.hold ?? 1);
    return Array.from({ length: hold }, () => step);
  });
}

export function CanvasSpriteAnimator({
  animation,
  className = "",
  ariaLabel,
  forceMotion = false,
  mirrorX = false,
}: CanvasSpriteAnimatorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isReducedMotion, setIsReducedMotion] = useState(getReducedMotionPreference);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setIsReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const image = new Image();
    image.decoding = "async";
    image.src = animation.src;
    imageRef.current = image;

    return () => {
      imageRef.current = null;
    };
  }, [animation.src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return undefined;

    const context = canvas.getContext("2d");
    if (!context) return undefined;
    const renderingContext = context;

    renderingContext.imageSmoothingEnabled = false;
    let animationFrameId = 0;
    let startTime = 0;
    let cancelled = false;
    const playbackSequence = getPlaybackSequence(animation);

    function drawFrame(step: SpritePlaybackFrame) {
      if (!canvas || !imageRef.current) return;
      const frameIndex = Math.min(Math.max(step.frame, 0), animation.frameCount - 1);
      const sourceX = frameIndex * animation.frameWidth;

      renderingContext.clearRect(0, 0, animation.frameWidth, animation.frameHeight);

      if (step.mirrorX !== mirrorX) {
        renderingContext.save();
        renderingContext.translate(animation.frameWidth, 0);
        renderingContext.scale(-1, 1);
        renderingContext.drawImage(
          imageRef.current,
          sourceX,
          0,
          animation.frameWidth,
          animation.frameHeight,
          0,
          0,
          animation.frameWidth,
          animation.frameHeight,
        );
        renderingContext.restore();
        return;
      }

      renderingContext.drawImage(
        imageRef.current,
        sourceX,
        0,
        animation.frameWidth,
        animation.frameHeight,
        0,
        0,
        animation.frameWidth,
        animation.frameHeight,
      );
    }

    function drawReducedMotionFrame() {
      drawFrame({ frame: animation.reducedMotionFrame });
    }

    function tick(timestamp: number) {
      if (cancelled) return;
      if (startTime === 0) startTime = timestamp;

      const elapsedSeconds = (timestamp - startTime) / 1000;
      const rawFrame = Math.floor(elapsedSeconds * animation.fps);
      const playbackIndex = animation.loop
        ? rawFrame % playbackSequence.length
        : Math.min(rawFrame, playbackSequence.length - 1);
      drawFrame(playbackSequence[playbackIndex]);

      if (animation.loop || playbackIndex < playbackSequence.length - 1) {
        animationFrameId = window.requestAnimationFrame(tick);
      }
    }

    function startDrawing() {
      renderingContext.imageSmoothingEnabled = false;
      if (isReducedMotion && !forceMotion) {
        drawReducedMotionFrame();
        return;
      }
      animationFrameId = window.requestAnimationFrame(tick);
    }

    if (image.complete) {
      startDrawing();
    } else {
      image.addEventListener("load", startDrawing, { once: true });
    }

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrameId);
      image.removeEventListener("load", startDrawing);
    };
  }, [animation, forceMotion, isReducedMotion, mirrorX]);

  const canvasStyle = {
    "--sprite-frame-width": `${animation.frameWidth}px`,
    "--sprite-frame-height": `${animation.frameHeight}px`,
  } as CSSProperties & Record<"--sprite-frame-width" | "--sprite-frame-height", string>;

  return (
    <canvas
      ref={canvasRef}
      className={`canvas-sprite-animator ${className}`}
      width={animation.frameWidth}
      height={animation.frameHeight}
      role="img"
      aria-label={ariaLabel}
      style={canvasStyle}
    />
  );
}
