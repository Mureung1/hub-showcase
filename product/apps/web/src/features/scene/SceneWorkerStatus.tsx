import { AlertTriangle, Cpu, RotateCcw } from "lucide-react";

import type { SceneJob, Toolchain } from "./sceneApi";

type Props = { error: string | null; job: SceneJob | null; onRetry: () => void; toolchain: Toolchain | null };

export function SceneWorkerStatus({ error, job, onRetry, toolchain }: Props) {
  return (
    <div className="scene-worker-status">
      <div className="scene-worker-heading">
        <Cpu size={20} />
        <div><b>GPU worker</b><span>{toolchain ? `${toolchain.mode === "docker" ? "Docker" : "Host"} · ${toolchain.gpu_name ?? "GPU 없음"} · ${toolchain.gpu_memory_mb ?? 0}MB` : "연결 확인 중"}</span></div>
        <strong className={toolchain?.ready ? "ready" : "blocked"}>{toolchain?.ready ? "READY" : "BLOCKED"}</strong>
      </div>
      {toolchain && !toolchain.ready && <p>최소 {toolchain.minimum_gpu_memory_mb}MB VRAM과 Nerfstudio toolchain이 필요합니다.{toolchain.mode === "docker" && toolchain.image ? ` Image: ${toolchain.image}` : ""}</p>}
      {job && <div className="scene-job-summary" aria-live="polite"><span>JOB {job.id.slice(0, 8)}</span><b>{job.status.toUpperCase()}</b><small>{job.files.length}개 파일 검증</small></div>}
      {error && <div className="scene-error"><AlertTriangle size={15} /> {error}</div>}
      {job?.blocked_reason && <div className="scene-blocked-note"><AlertTriangle size={15} /><div><b>이 worker에서는 학습할 수 없습니다.</b><span>{job.blocked_reason}</span><button type="button" onClick={onRetry}><RotateCcw size={13} /> 다시 확인</button></div></div>}
    </div>
  );
}
