import { ArrowLeft, Camera, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ShotFrame } from "../types/photoSpot";

type Props = {
  frame: ShotFrame;
  onBack: () => void;
  onCapture: (image: string) => void;
};

export function CameraCapture({ frame, onBack, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "blocked">("loading");
  const [opacity, setOpacity] = useState(72);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let disposed = false;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (disposed || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setState("ready");
      } catch {
        setState("blocked");
      }
    };
    void startCamera();
    return () => { disposed = true; stream?.getTracks().forEach((track) => track.stop()); };
  }, []);

  const capture = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;
    const width = video?.videoWidth || 900;
    const height = video?.videoHeight || 1200;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    if (state === "ready" && video) context.drawImage(video, 0, 0, width, height);
    else {
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#d4edff"); gradient.addColorStop(.48, "#eaf7e7"); gradient.addColorStop(.49, "#78ad55"); gradient.addColorStop(1, "#375f36");
      context.fillStyle = gradient; context.fillRect(0, 0, width, height);
    }
    context.globalAlpha = opacity / 100;
    context.strokeStyle = "#ffffff"; context.lineWidth = Math.max(4, width / 160); context.setLineDash([12, 10]);
    context.beginPath(); context.moveTo(width * .1, height * .35); context.quadraticCurveTo(width * .5, height * .08, width * .9, height * .35); context.stroke();
    context.setLineDash([]);
    const frames = frame.people === "couple" ? [[.29, .39, .18, .37], [.53, .39, .18, .37]] : [[.39, .34, .23, .48]];
    frames.forEach(([x, y, w, h]) => { context.strokeRect(width * x, height * y, width * w, height * h); context.beginPath(); context.arc(width * (x + w / 2), height * (y + .08), width * .06, 0, Math.PI * 2); context.stroke(); });
    onCapture(canvas.toDataURL("image/png"));
  };

  return <section className="camera-screen">
    <header className="camera-header"><button type="button" onClick={onBack} aria-label="프레임 선택으로"><ArrowLeft size={24} /></button><div><small>오버레이 촬영</small><strong>{frame.title}</strong></div><span>{state === "ready" ? "LIVE" : "GUIDE"}</span></header>
    <div className={`camera-view ${frame.tone}`}>
      <video ref={videoRef} className="camera-video" playsInline muted />
      {state !== "ready" && <div className="camera-fallback"><p>{state === "loading" ? "카메라를 준비하고 있어요" : "카메라 권한을 허용하면 실제 화면으로 촬영할 수 있어요"}</p></div>}
      <div className="composition-overlay" style={{ opacity: opacity / 100 }}><div className="building-line" />{frame.people === "couple" ? <><div className="person-guide left" /><div className="person-guide right" /></> : <div className="person-guide solo" />}</div>
    </div>
    <div className="camera-panel"><p>{frame.guide}</p><label>오버레이 <input type="range" min="35" max="95" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} /><b>{opacity}%</b></label><div className="shutter-row"><button type="button" aria-label="카메라 전환"><RotateCcw size={23} /></button><button type="button" className="shutter" onClick={capture} aria-label="사진 촬영"><Camera size={26} /></button><span /></div></div><canvas ref={canvasRef} hidden />
  </section>;
}
