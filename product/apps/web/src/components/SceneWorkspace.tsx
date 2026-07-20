import {
  AlertTriangle,
  Box,
  CheckCircle2,
  Clock3,
  Cpu,
  FileImage,
  Lock,
  RotateCcw,
  UploadCloud,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { SplatViewer } from "./SplatViewer";

type CaptureType = "images" | "video" | "equirectangular_images" | "equirectangular_video";
type JobStatus = "uploaded" | "queued" | "running" | "blocked" | "failed" | "ready";

type Toolchain = {
  ready: boolean;
  mode: "host" | "docker";
  image: string | null;
  gpu_name: string | null;
  gpu_memory_mb: number | null;
  minimum_gpu_memory_mb: number;
  blockers: string[];
};

type SceneJob = {
  id: string;
  scene_name: string;
  capture_type: CaptureType;
  status: JobStatus;
  blocked_reason: string | null;
  next_action: string | null;
  asset_url: string | null;
  camera_pose: {
    position: [number, number, number];
    target: [number, number, number];
    up: [number, number, number];
  } | null;
  files: Array<{ name: string; size_bytes: number; sha256: string }>;
  stages: Array<{ name: string; status: string; message: string | null }>;
};

type SceneWorkspaceProps = {
  onClose: () => void;
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const sceneHours = ["10:00", "13:00", "15:00", "18:00"] as const;
const stageLabels: Record<string, string> = {
  validate: "입력 검증",
  preprocess: "카메라 복원",
  train: "Splatfacto 학습",
  export: "PLY 내보내기",
};

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

function assetUrl(path: string) {
  return path.startsWith("http") ? path : apiUrl(path);
}

export function SceneWorkspace({ onClose }: SceneWorkspaceProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [captureType, setCaptureType] = useState<CaptureType>("equirectangular_video");
  const [sceneName, setSceneName] = useState("관평동 점포 전면");
  const [sceneHour, setSceneHour] = useState<(typeof sceneHours)[number]>("13:00");
  const [toolchain, setToolchain] = useState<Toolchain | null>(null);
  const [job, setJob] = useState<SceneJob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => returnFocusRef.current?.focus());
    };
  }, [onClose]);

  useEffect(() => {
    let active = true;
    fetch(apiUrl("/api/v1/scenes/toolchain"))
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<Toolchain>;
      })
      .then((payload) => {
        if (active) setToolchain(payload);
      })
      .catch(() => {
        if (active) setError("GPU worker API가 연결되지 않았습니다.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!job || !["queued", "running"].includes(job.status)) return;
    const timer = window.setInterval(() => {
      fetch(apiUrl(`/api/v1/scenes/jobs/${job.id}`))
        .then((response) => response.json() as Promise<SceneJob>)
        .then(setJob)
        .catch(() => setError("작업 상태를 확인할 수 없습니다."));
    }, 2_000);
    return () => window.clearInterval(timer);
  }, [job]);

  const accept = useMemo(
    () => (captureType.endsWith("video") ? ".mp4,.mov,.mkv" : ".jpg,.jpeg,.png,.heic"),
    [captureType],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const files = fileRef.current?.files;
    if (!files?.length) {
      setError("촬영 파일을 선택해주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const form = new FormData();
    form.set("scene_name", sceneName);
    form.set("capture_type", captureType);
    form.set("auto_run", "true");
    Array.from(files).forEach((file) => form.append("files", file));
    try {
      const response = await fetch(apiUrl("/api/v1/scenes/jobs"), { method: "POST", body: form });
      const payload = (await response.json()) as SceneJob | { detail?: string };
      if (!response.ok || !("id" in payload)) {
        throw new Error("detail" in payload ? payload.detail : "업로드에 실패했습니다.");
      }
      setJob(payload);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "업로드에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function retry() {
    if (!job) return;
    setError(null);
    const response = await fetch(apiUrl(`/api/v1/scenes/jobs/${job.id}/run`), { method: "POST" });
    if (!response.ok) {
      setError("작업을 다시 시작할 수 없습니다.");
      return;
    }
    setJob((await response.json()) as SceneJob);
  }

  return (
    <div className="modal-backdrop scene-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="scene-modal-title"
        className="scene-modal scene-workspace"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          className="modal-close"
          type="button"
          aria-label="3D 장소 닫기"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <header className="scene-modal-header">
          <p className="modal-eyebrow">SCENE PIPELINE · SUPPORTING FEATURE</p>
          <h2 id="scene-modal-title">관평동 3D 장소 생성</h2>
          <p>360 영상 또는 사진을 검증하고 Gaussian Splat asset으로 변환합니다.</p>
        </header>

        {job?.status === "ready" && job.asset_url ? (
          <SplatViewer
            assetUrl={assetUrl(job.asset_url)}
            filterScaleOutliers
            initialCamera={job.camera_pose}
          />
        ) : (
          <div className="scene-pipeline-surface">
            <form className="scene-upload" onSubmit={submit}>
              <div className="scene-upload-heading">
                <UploadCloud size={22} />
                <div>
                  <b>촬영물 업로드</b>
                  <span>원본은 로컬 scene storage에만 저장됩니다.</span>
                </div>
              </div>
              <label>
                <span>장면 이름</span>
                <input value={sceneName} onChange={(event) => setSceneName(event.target.value)} />
              </label>
              <label>
                <span>촬영 형식</span>
                <select
                  value={captureType}
                  onChange={(event) => setCaptureType(event.target.value as CaptureType)}
                >
                  <option value="equirectangular_video">360 영상</option>
                  <option value="equirectangular_images">360 사진</option>
                  <option value="video">일반 영상</option>
                  <option value="images">일반 사진 묶음</option>
                </select>
              </label>
              <label className="scene-file-input">
                <FileImage size={18} />
                <span>파일 선택</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept={accept}
                  multiple={!captureType.endsWith("video")}
                />
              </label>
              <button className="primary-action" type="submit" disabled={submitting}>
                <UploadCloud size={16} /> {submitting ? "업로드 중" : "자동 변환 시작"}
              </button>
            </form>

            <div className="scene-worker-status">
              <div className="scene-worker-heading">
                <Cpu size={20} />
                <div>
                  <b>GPU worker</b>
                  <span>
                    {toolchain
                      ? `${toolchain.mode === "docker" ? "Docker" : "Host"} · ${toolchain.gpu_name ?? "GPU 없음"} · ${toolchain.gpu_memory_mb ?? 0}MB`
                      : "연결 확인 중"}
                  </span>
                </div>
                <strong className={toolchain?.ready ? "ready" : "blocked"}>
                  {toolchain?.ready ? "READY" : "BLOCKED"}
                </strong>
              </div>
              {toolchain && !toolchain.ready && (
                <p>
                  최소 {toolchain.minimum_gpu_memory_mb}MB VRAM과 Nerfstudio toolchain이 필요합니다.
                  {toolchain.mode === "docker" && toolchain.image
                    ? ` Image: ${toolchain.image}`
                    : ""}
                </p>
              )}
              {job && (
                <div className="scene-job-summary" aria-live="polite">
                  <span>JOB {job.id.slice(0, 8)}</span>
                  <b>{job.status.toUpperCase()}</b>
                  <small>{job.files.length}개 파일 검증</small>
                </div>
              )}
              {error && (
                <div className="scene-error">
                  <AlertTriangle size={15} /> {error}
                </div>
              )}
              {job?.blocked_reason && (
                <div className="scene-blocked-note">
                  <AlertTriangle size={15} />
                  <div>
                    <b>이 worker에서는 학습할 수 없습니다.</b>
                    <span>{job.blocked_reason}</span>
                    <button type="button" onClick={retry}>
                      <RotateCcw size={13} /> 다시 확인
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="scene-modal-content">
          <div className="scene-progress scene-job-progress" aria-label="3D 장면 처리 단계">
            {(
              job?.stages ?? [
                { name: "validate", status: "pending", message: null },
                { name: "preprocess", status: "pending", message: null },
                { name: "train", status: "pending", message: null },
                { name: "export", status: "pending", message: null },
              ]
            ).map((stage, index) => (
              <div key={stage.name} className={`stage-${stage.status}`}>
                <i>{stage.status === "passed" ? <CheckCircle2 size={13} /> : index + 1}</i>
                <b>{stageLabels[stage.name]}</b>
                <span>{stage.message ?? stage.status}</span>
              </div>
            ))}
          </div>

          <section className="scene-time-section">
            <div>
              <span>대표 관찰 시간</span>
              <p>시간 선택은 장면 메타데이터이며 혼잡도 측정값이 아닙니다.</p>
            </div>
            <div className="scene-time-buttons" role="group" aria-label="촬영 계획 시간">
              {sceneHours.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  className={sceneHour === hour ? "is-selected" : ""}
                  aria-pressed={sceneHour === hour}
                  onClick={() => setSceneHour(hour)}
                >
                  {hour}
                </button>
              ))}
            </div>
          </section>

          <div className="scene-privacy">
            <Lock size={17} />
            <div>
              <b>Privacy gate</b>
              <span>얼굴·차량번호 익명화 검증 전에는 생성 asset을 외부에 공개하지 않습니다.</span>
            </div>
          </div>
          <footer className="scene-modal-footer">
            <p>3D 장면은 상권 점수를 대신하지 않고 선택 장소의 공간 맥락만 보조합니다.</p>
            <span>
              <Clock3 size={14} /> {sceneHour}
            </span>
            {job?.status === "ready" && <Box size={16} />}
          </footer>
        </div>
      </section>
    </div>
  );
}
