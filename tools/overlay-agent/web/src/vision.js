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

export function extractSceneGuide(image) {
  // Very small images do not contain enough visual information for a useful guide.
  if (image.naturalWidth < 64 || image.naturalHeight < 64) {
    return { horizonY: 0.62, backgroundLines: [] };
  }

  const maxEdge = 640;
  const ratio = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.round(image.naturalWidth * ratio);
  const height = Math.round(image.naturalHeight * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const candidates = [];

  // A lightweight row contrast pass: stable in mobile browsers and fast enough
  // for a composition guide. It deliberately avoids semantic building labels.
  for (let y = Math.round(height * 0.15); y < Math.round(height * 0.86); y += 2) {
    let contrast = 0;
    let samples = 0;
    for (let x = 0; x < width; x += 4) {
      const index = (y * width + x) * 4;
      const above = ((y - 1) * width + x) * 4;
      const currentLuma = pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114;
      const aboveLuma = pixels[above] * 0.299 + pixels[above + 1] * 0.587 + pixels[above + 2] * 0.114;
      contrast += Math.abs(currentLuma - aboveLuma);
      samples += 1;
    }
    candidates.push({ y, score: contrast / samples });
  }

  const strongestRows = candidates
    .sort((a, b) => b.score - a.score)
    .reduce((rows, candidate) => {
      if (rows.length < 3 && rows.every((row) => Math.abs(row.y - candidate.y) > height * 0.08)) rows.push(candidate);
      return rows;
    }, [])
    .sort((a, b) => a.y - b.y);

  const horizonCandidate = strongestRows
    .filter((row) => row.y > height * 0.35 && row.y < height * 0.8)
    .sort((a, b) => b.score - a.score)[0];
  const horizonY = horizonCandidate ? horizonCandidate.y / height : 0.62;
  const backgroundLines = strongestRows.map((row) => ({
    start: [0.08, row.y / height],
    end: [0.92, row.y / height],
  }));

  return { horizonY, backgroundLines };
}
