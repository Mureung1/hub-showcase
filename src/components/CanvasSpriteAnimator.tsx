import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { SpriteAnimationAsset } from "../data/assetManifest";

interface CanvasSpriteAnimatorProps {
  animation: SpriteAnimationAsset;
  className?: string;
  ariaLabel: string;
}

function getReducedMotionPreference() {
  if (typeof window === "undefined" || !("matchMedia" in window)) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function CanvasSpriteAnimator({ animation, className = "", ariaLabel }: CanvasSpriteAnimatorProps) {
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

    function drawFrame(frameIndex: number) {
      if (!canvas || !imageRef.current) return;
      renderingContext.clearRect(0, 0, animation.frameWidth, animation.frameHeight);
      renderingContext.drawImage(
        imageRef.current,
        frameIndex * animation.frameWidth,
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
      drawFrame(Math.min(animation.reducedMotionFrame, animation.frameCount - 1));
    }

    function tick(timestamp: number) {
      if (cancelled) return;
      if (startTime === 0) startTime = timestamp;

      const elapsedSeconds = (timestamp - startTime) / 1000;
      const rawFrame = Math.floor(elapsedSeconds * animation.fps);
      const frameIndex = animation.loop ? rawFrame % animation.frameCount : Math.min(rawFrame, animation.frameCount - 1);
      drawFrame(frameIndex);

      if (animation.loop || frameIndex < animation.frameCount - 1) {
        animationFrameId = window.requestAnimationFrame(tick);
      }
    }

    function startDrawing() {
      renderingContext.imageSmoothingEnabled = false;
      if (isReducedMotion) {
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
  }, [animation, isReducedMotion]);

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
