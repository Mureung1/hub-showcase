import { mapBlendshapesToFaceSignal } from "../utils/mapBlendshapesToFaceSignal";
import { stabilizeFaceSignal } from "../utils/stabilizeFaceSignal";

const SAMPLE_WINDOW_SIZE = 5;

export function processFaceResult(result, previousSamples) {
  const faceCount = result.faceLandmarks?.length || 0;

  if (faceCount === 0) {
    return { status: "no-face", samples: [], stableResult: null };
  }

  if (faceCount > 1) {
    return { status: "multiple-faces", samples: [], stableResult: null };
  }

  const categories = result.faceBlendshapes?.[0]?.categories || [];
  const mappedResult = mapBlendshapesToFaceSignal(categories);
  const samples = [...previousSamples, mappedResult].slice(-SAMPLE_WINDOW_SIZE);
  const stableResult = stabilizeFaceSignal(samples);

  return {
    status: stableResult ? "detected" : "stabilizing",
    samples,
    stableResult
  };
}
