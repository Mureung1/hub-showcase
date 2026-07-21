export type CaptureType = "images" | "video" | "equirectangular_images" | "equirectangular_video";
export type JobStatus = "uploaded" | "queued" | "running" | "blocked" | "failed" | "ready";

export type Toolchain = {
  ready: boolean;
  mode: "host" | "docker";
  image: string | null;
  gpu_name: string | null;
  gpu_memory_mb: number | null;
  minimum_gpu_memory_mb: number;
  blockers: string[];
};

export type SceneJob = {
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

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export function sceneApiUrl(path: string) {
  return `${API_BASE}${path}`;
}

export function sceneAssetUrl(path: string) {
  return path.startsWith("http") ? path : sceneApiUrl(path);
}

async function readSceneResponse(response: Response): Promise<SceneJob> {
  const payload = (await response.json()) as SceneJob | { detail?: string };
  if (!response.ok || !("id" in payload)) {
    throw new Error("detail" in payload ? payload.detail ?? "Scene request failed." : "Scene request failed.");
  }
  return payload;
}

export async function loadSceneToolchain(signal: AbortSignal): Promise<Toolchain> {
  const response = await fetch(sceneApiUrl("/api/v1/scenes/toolchain"), { signal });
  if (!response.ok) throw new Error("GPU worker API가 연결되지 않았습니다.");
  return response.json() as Promise<Toolchain>;
}

export async function loadSceneJob(id: string, signal: AbortSignal): Promise<SceneJob> {
  return readSceneResponse(await fetch(sceneApiUrl(`/api/v1/scenes/jobs/${id}`), { signal }));
}

export async function createSceneJob(form: FormData): Promise<SceneJob> {
  return readSceneResponse(
    await fetch(sceneApiUrl("/api/v1/scenes/jobs"), { method: "POST", body: form }),
  );
}

export async function retrySceneJob(id: string): Promise<SceneJob> {
  return readSceneResponse(
    await fetch(sceneApiUrl(`/api/v1/scenes/jobs/${id}/run`), { method: "POST" }),
  );
}
