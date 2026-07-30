/**
 * SPEC-EXPORT-001 §6 — Blob을 사용자 로컬 파일로 내려보낸다.
 *
 * ```text
 * 1. URL.createObjectURL(blob)
 * 2. <a download={파일명}> 클릭 트리거
 * 3. URL.revokeObjectURL   ← 빠뜨리면 메모리 누수 (AC7)
 * ```
 *
 * 3번을 `finally`에 둔다. 클릭 트리거가 던져도 URL은 반드시 해제된다.
 * 이 파일만 DOM에 의존한다 — MD 조립은 `exportMarkdown.ts`, Zip은 `buildZip.ts`.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
