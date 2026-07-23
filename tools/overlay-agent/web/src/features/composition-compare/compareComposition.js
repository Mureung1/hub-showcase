export class CompositionComparisonError extends Error {}

export async function compareComposition({ referenceFile, layoutFile, capturedFile }) {
  if (!referenceFile || !layoutFile || !capturedFile) {
    throw new CompositionComparisonError("예시 사진, layout JSON, 촬영 사진을 모두 선택하세요.");
  }

  const body = new FormData();
  body.append("reference_file", referenceFile);
  body.append("layout_file", layoutFile);
  body.append("captured_file", capturedFile);

  let response;
  try {
    response = await fetch("/api/compare", { method: "POST", body });
  } catch {
    throw new CompositionComparisonError("비교 서버에 연결하지 못했습니다. 통합 실행 스크립트로 서버를 시작하세요.");
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new CompositionComparisonError(result.detail || "구도 비교를 완료하지 못했습니다.");
  }
  return result;
}
