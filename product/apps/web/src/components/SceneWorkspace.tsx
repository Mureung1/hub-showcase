import { Box, Clock3, FileImage, Lock, UploadCloud, X } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { sceneAssetUrl, type CaptureType } from "../features/scene/sceneApi";
import { SceneProgress } from "../features/scene/SceneProgress";
import { SceneWorkerStatus } from "../features/scene/SceneWorkerStatus";
import { useSceneJob } from "../features/scene/useSceneJob";
import { useSceneToolchain } from "../features/scene/useSceneToolchain";
import { SplatViewer } from "./SplatViewer";

type SceneWorkspaceProps = {
  onClose: () => void;
};

const sceneHours = ["10:00", "13:00", "15:00", "18:00"] as const;

export function SceneWorkspace({ onClose }: SceneWorkspaceProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [captureType, setCaptureType] = useState<CaptureType>("equirectangular_video");
  const [sceneName, setSceneName] = useState("관평동 점포 전면");
  const [sceneHour, setSceneHour] = useState<(typeof sceneHours)[number]>("13:00");
  const { toolchain, error: toolchainError } = useSceneToolchain();
  const { error: jobError, job, retry, setError, submit: submitJob, submitting } = useSceneJob();
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
    const form = new FormData();
    form.set("scene_name", sceneName);
    form.set("capture_type", captureType);
    form.set("auto_run", "true");
    Array.from(files).forEach((file) => form.append("files", file));
    await submitJob(form);
  }

  const error = jobError ?? toolchainError;

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
            assetUrl={sceneAssetUrl(job.asset_url)}
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

            <SceneWorkerStatus error={error} job={job} onRetry={retry} toolchain={toolchain} />
          </div>
        )}

        <div className="scene-modal-content">
          <SceneProgress job={job} />

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
