import { useEffect, useRef } from "react";
import { createScanDetector } from "./scanDetector";

// document capture 단계 keydown 어댑터. 스캐너 버스트를 감지해 onScan을 호출하고,
// 버스트 문자는 preventDefault로 삼켜 포커스된 입력칸(수동 입력·이후 등록 모달)을 오염시키지 않는다.
// 사람의 느린 타이핑은 감지기가 무시하므로 ScanBar 등 수동 입력은 정상 동작한다.
export function useScanner(onScan: (barcode: string) => void) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    const detector = createScanDetector();

    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.altKey || e.metaKey || e.isComposing) return;

      const { barcode, consume } = detector.push(e.key, e.timeStamp);
      if (consume) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (barcode) onScanRef.current(barcode);
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, []);
}
