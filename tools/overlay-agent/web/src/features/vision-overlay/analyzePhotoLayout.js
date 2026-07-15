import { createGuide, selectFrames } from "../../lib/guide";
import { extractSceneGuide, loadPoseLandmarker } from "../../vision";

export class LayoutAnalysisError extends Error {}

const nextPaint = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

/**
 * UI와 분리된 사진 분석 진입점입니다.
 * 이후 포토스팟 상세나 카메라 화면에서도 이 함수만 호출하면 됩니다.
 */
export async function analyzePhotoLayout({ image, mode, onProgress = () => {} }) {
  onProgress(1, "로컬 Vision 모델을 준비하고 있습니다.");
  const poseLandmarker = await loadPoseLandmarker();

  await nextPaint();
  onProgress(2, "사진 속 인물 위치를 감지하고 있습니다.");
  const poseResult = poseLandmarker.detect(image);
  const personFrames = selectFrames(poseResult.landmarks ?? [], mode);
  const requiredFrames = mode === "solo" ? 1 : 2;

  if (personFrames.length < requiredFrames) {
    throw new LayoutAnalysisError(
      mode === "solo"
        ? "인물을 감지하지 못했습니다. 인물이 더 선명한 사진을 선택하세요."
        : "커플 인물 2명을 모두 감지하지 못했습니다. 1인 모드로 바꾸거나 다른 사진을 선택하세요.",
    );
  }

  await nextPaint();
  onProgress(3, "배경의 수평선과 대표 윤곽을 찾고 있습니다.");
  let scene;
  let warning = "";
  try {
    scene = extractSceneGuide(image);
  } catch {
    // 인물 가이드는 유효하므로 배경선만 기본값으로 내려가게 합니다.
    scene = { horizonY: 0.62, backgroundLines: [] };
    warning = "배경 윤곽은 찾지 못해 기본 수평 가이드로 생성했습니다.";
  }

  await nextPaint();
  onProgress(4, "촬영 가이드와 다운로드 파일을 만들고 있습니다.");
  const guide = createGuide({ personFrames, ...scene });

  return { guide, warning };
}
