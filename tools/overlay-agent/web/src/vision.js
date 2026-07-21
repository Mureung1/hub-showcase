import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

let poseLandmarkerPromise;

function assetUrl(path) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

export function loadPoseLandmarker() {
  if (!poseLandmarkerPromise) {
    poseLandmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(assetUrl("/wasm"));
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: assetUrl("/models/pose_landmarker_lite.task") },
        runningMode: "IMAGE",
        numPoses: 2,
        minPoseDetectionConfidence: 0.45,
        minPosePresenceConfidence: 0.45,
        minTrackingConfidence: 0.45,
      });
    })();
  }
  return poseLandmarkerPromise;
}
