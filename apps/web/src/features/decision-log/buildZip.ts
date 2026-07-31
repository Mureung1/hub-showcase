import JSZip from "jszip";
import type { ZipEntry } from "./exportMarkdown";

/**
 * SPEC-EXPORT-001 §5·§6-1 — JSZip 조립.
 *
 * **`exportMarkdown.ts`에서 분리해 둔 이유**는 검증 스크립트(`apps/web/scripts/exportCheck.ts`)가
 * MD·파일명 함수만 import해도 jszip이 딸려오지 않게 하기 위해서다. E-1의 검증 4건은 전부
 * 문자열 함수라 Zip이 필요 없는데, 같은 모듈에 있으면 import만으로 jszip이 로드되고
 * Node에서 `Blob` 처리가 어떻게 될지 불확실해진다. 동적 import보다 파일 분리가 명확하다.
 *
 * DOM에는 의존하지 않는다 — 다운로드 트리거는 `downloadBlob.ts`에 있다.
 */
export async function buildZipBlob(entries: ZipEntry[]): Promise<Blob> {
  const zip = new JSZip();
  for (const entry of entries) {
    zip.file(entry.fileName, entry.content);
  }
  return zip.generateAsync({ type: "blob" });
}
