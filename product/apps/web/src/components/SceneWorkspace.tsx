import { Box, Clock3, Cloud, FileImage, HardDrive, Lock, Play, UploadCloud, X } from "lucide-react";
import { type FormEvent, type RefObject, useEffect, useMemo, useRef, useState } from "react";

import { sceneAssetUrl, type CaptureType } from "../features/scene/sceneApi";
import { SceneObservationPanel } from "../features/scene/SceneObservationPanel";
import { SceneProgress } from "../features/scene/SceneProgress";
import { SceneWorkerStatus } from "../features/scene/SceneWorkerStatus";
import {
  createSceneCrowdPositions,
  findSceneObservation,
  GWANPYEONG_SCENE_OBSERVATIONS,
  type SceneObservationTime,
} from "../features/scene/sceneObservations";
import { useSceneJob } from "../features/scene/useSceneJob";
import { useSceneToolchain } from "../features/scene/useSceneToolchain";
import { SplatViewer } from "./SplatViewer";

type SceneWorkspaceProps = {
  onClose: () => void;
  restoreFocusExternally: boolean;
};

type SceneDemoAsset = {
  id: string;
  label: string;
  splatUrl: string;
  videoUrl: string;
};

const DEMO_SPLAT_URL =
  import.meta.env.VITE_SCENE_DEMO_ASSET_URL ?? "https://sparkjs.dev/assets/splats/butterfly.spz";

const SCENE_DEMO_ASSETS: SceneDemoAsset[] = [
  {
    id: "jongmyo",
    label: "종묘",
    splatUrl: `${import.meta.env.BASE_URL}splats/jongmyo.ply`,
    videoUrl: `${import.meta.env.BASE_URL}videos/jongmyo.mp4`,
  },
  {
    id: "gwanpyeong",
    label: "관평동 거리",
    splatUrl: `${import.meta.env.BASE_URL}splats/Gwanpyeong-dong.ply`,
    videoUrl: `${import.meta.env.BASE_URL}videos/Gwanpyeong-dong.mp4`,
  },
];

async function assetExists(url: string) {
  try {
    const response = await fetch(url, { method: "HEAD", cache: "no-store" });
    const contentType = response.headers.get("content-type");
    return response.ok && !contentType?.includes("text/html");
  } catch {
    return false;
  }
}

export function SceneWorkspace({ onClose, restoreFocusExternally }: SceneWorkspaceProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [captureType, setCaptureType] = useState<CaptureType>("equirectangular_video");
  const [sceneName, setSceneName] = useState("관평동 점포 전면");
  const [sceneHour, setSceneHour] = useState<SceneObservationTime>("13:00");
  const [workspaceMode, setWorkspaceMode] = useState<"demo" | "create">("demo");
  const { toolchain, error: toolchainError } = useSceneToolchain(workspaceMode === "create");
  const { error: jobError, job, retry, setError, submit: submitJob, submitting } = useSceneJob();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!restoreFocusExternally) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (!restoreFocusExternally) window.setTimeout(() => returnFocusRef.current?.focus());
    };
  }, [onClose, restoreFocusExternally]);

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
  const observation = findSceneObservation(GWANPYEONG_SCENE_OBSERVATIONS, sceneHour);
  const crowdPositions = useMemo(
    () => createSceneCrowdPositions(sceneHour, observation.displayObjectCount),
    [observation.displayObjectCount, sceneHour],
  );

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
          <p className="modal-eyebrow">EXPERIMENTAL · GAUSSIAN SPLATTING</p>
          <h2 id="scene-modal-title">3DGS 실험실</h2>
          <p>샘플 장면을 먼저 체험하거나 촬영물을 Gaussian Splat asset으로 변환합니다.</p>
        </header>

        <div className="scene-mode-tabs" role="tablist" aria-label="3DGS 실험 기능">
          <button
            type="button"
            role="tab"
            aria-selected={workspaceMode === "demo"}
            className={workspaceMode === "demo" ? "is-selected" : ""}
            onClick={() => setWorkspaceMode("demo")}
          >
            <Play size={15} /> 샘플 결과 보기
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={workspaceMode === "create"}
            className={workspaceMode === "create" ? "is-selected" : ""}
            onClick={() => setWorkspaceMode("create")}
          >
            <UploadCloud size={15} /> 새 장면 만들기
          </button>
        </div>

        {workspaceMode === "demo" ? (
          <SceneDemoContent />
        ) : (
          <SceneCreateContent
            accept={accept}
            captureType={captureType}
            crowdPositions={crowdPositions}
            error={error}
            fileRef={fileRef}
            job={job}
            observationTime={sceneHour}
            sceneName={sceneName}
            submitting={submitting}
            toolchain={toolchain}
            onCaptureTypeChange={setCaptureType}
            onObservationTimeChange={setSceneHour}
            onRetry={retry}
            onSceneNameChange={setSceneName}
            onSubmit={submit}
          />
        )}
      </section>
    </div>
  );
}

function SceneDemoContent() {
  const [availableAssets, setAvailableAssets] = useState<SceneDemoAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [availableVideos, setAvailableVideos] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    Promise.all(
      SCENE_DEMO_ASSETS.map(async (asset) => ({
        asset,
        hasSplat: await assetExists(asset.splatUrl),
        hasVideo: await assetExists(asset.videoUrl),
      })),
    ).then((results) => {
      if (cancelled) return;
      const splatAssets = results.filter((result) => result.hasSplat).map((result) => result.asset);
      setAvailableAssets(splatAssets);
      setSelectedAssetId((current) => current ?? splatAssets[0]?.id ?? null);
      setAvailableVideos(new Set(results.filter((result) => result.hasVideo).map((result) => result.asset.id)));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedAsset = availableAssets.find((asset) => asset.id === selectedAssetId);
  const viewerAssetUrl = selectedAsset?.splatUrl ?? DEMO_SPLAT_URL;

  return (
    <>
      {availableAssets.length > 0 && (
        <div className="scene-mode-tabs" role="tablist" aria-label="3DGS 장면 선택">
          {availableAssets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              role="tab"
              aria-selected={asset.id === selectedAssetId}
              className={asset.id === selectedAssetId ? "is-selected" : ""}
              onClick={() => setSelectedAssetId(asset.id)}
            >
              {asset.label}
            </button>
          ))}
        </div>
      )}

      <div className="scene-demo-viewer">
        <SplatViewer key={viewerAssetUrl} assetUrl={viewerAssetUrl} />
        <span>
          {selectedAsset
            ? `${selectedAsset.label} · 마우스로 회전하고 휠로 확대할 수 있습니다.`
            : "Spark 공식 SPZ 샘플 · LocalTwin 촬영 결과가 아닙니다."}
        </span>
      </div>

      <div className="scene-modal-content scene-demo-content">
        <div className="scene-demo-summary">
          <b>마우스로 회전하고 휠로 확대해 보세요.</b>
          <p>로컬 PLY 파일이 있으면 해당 장면을 불러오고, 없으면 기본 Spark 샘플을 표시합니다.</p>
        </div>

        {selectedAsset && availableVideos.has(selectedAsset.id) && (
          <div className="scene-storage-grid" aria-label="3DGS 렌더 영상">
            <article>
              <Play size={18} />
              <div>
                <b>{selectedAsset.label} 렌더 영상</b>
                <a href={selectedAsset.videoUrl} target="_blank" rel="noreferrer">
                  새 창에서 보기
                </a>
              </div>
            </article>
          </div>
        )}

        <div className="scene-storage-grid">
          <article>
            <HardDrive size={18} />
            <div>
              <b>현재 로컬 저장</b>
              <code>product/apps/web/public/splats/*.ply</code>
            </div>
          </article>
          <article>
            <Cloud size={18} />
            <div>
              <b>서버 저장</b>
              <span>아직 연결 전 · Object Storage 연결 후 배포합니다.</span>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}

type SceneCreateContentProps = {
  accept: string;
  captureType: CaptureType;
  crowdPositions: ReturnType<typeof createSceneCrowdPositions>;
  error: string | null;
  fileRef: RefObject<HTMLInputElement | null>;
  job: ReturnType<typeof useSceneJob>["job"];
  observationTime: SceneObservationTime;
  sceneName: string;
  submitting: boolean;
  toolchain: ReturnType<typeof useSceneToolchain>["toolchain"];
  onCaptureTypeChange: (captureType: CaptureType) => void;
  onObservationTimeChange: (time: SceneObservationTime) => void;
  onRetry: () => void;
  onSceneNameChange: (sceneName: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function SceneCreateContent({
  accept,
  captureType,
  crowdPositions,
  error,
  fileRef,
  job,
  observationTime,
  sceneName,
  submitting,
  toolchain,
  onCaptureTypeChange,
  onObservationTimeChange,
  onRetry,
  onSceneNameChange,
  onSubmit,
}: SceneCreateContentProps) {
  const isReady = job?.status === "ready" && job.asset_url;
  return (
    <>
      {isReady ? (
        <SplatViewer
          assetUrl={sceneAssetUrl(job.asset_url!)}
          crowdPositions={crowdPositions}
          filterScaleOutliers
          initialCamera={job.camera_pose}
        />
      ) : (
        <div className="scene-pipeline-surface">
          <form className="scene-upload" onSubmit={onSubmit}>
            <div className="scene-upload-heading">
              <UploadCloud size={22} />
              <div>
                <b>촬영물 업로드</b>
                <span>원본은 현재 로컬 scene storage에만 저장됩니다.</span>
              </div>
            </div>
            <label>
              <span>장면 이름</span>
              <input value={sceneName} onChange={(event) => onSceneNameChange(event.target.value)} />
            </label>
            <label>
              <span>촬영 형식</span>
              <select
                value={captureType}
                onChange={(event) => onCaptureTypeChange(event.target.value as CaptureType)}
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
          <SceneWorkerStatus error={error} job={job} onRetry={onRetry} toolchain={toolchain} />
        </div>
      )}
      <div className="scene-modal-content">
        <SceneProgress job={job} />
        <SceneObservationPanel
          observations={GWANPYEONG_SCENE_OBSERVATIONS}
          selectedTime={observationTime}
          onChange={onObservationTimeChange}
        />
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
            <Clock3 size={14} /> {observationTime}
          </span>
          {job?.status === "ready" && <Box size={16} />}
        </footer>
      </div>
    </>
  );
}
