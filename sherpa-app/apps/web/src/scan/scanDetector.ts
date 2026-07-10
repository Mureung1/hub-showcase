// 스캐너 버스트 감지의 순수 로직 (DOM 무관 → 헤드리스로 결정적 검증 가능).
// keydown을 (key, time)으로 흘려 넣으면, 스캐너 연타(수 ms 간격 + 끝에 Enter)를
// 사람 타이핑과 구분해 완성된 바코드를 돌려준다.

export interface ScanDetectorResult {
  /** Enter로 확정된 바코드 — 스캔이 아니면 null */
  barcode: string | null;
  /** 이 keydown을 삼켜야(preventDefault) 하는가 — 버스트 문자를 입력칸 오염에서 차단 */
  consume: boolean;
}

export interface ScanDetectorOptions {
  /** 연타로 볼 최대 키 간격(ms). 스캐너 ≪ 이 값 ≪ 사람 타이핑 */
  maxGapMs?: number;
  /** 스캔으로 인정할 최소 바코드 길이 */
  minLength?: number;
}

export function createScanDetector(options: ScanDetectorOptions = {}) {
  const maxGapMs = options.maxGapMs ?? 50;
  const minLength = options.minLength ?? 4;

  let buffer = "";
  let lastTime = -Infinity;
  let isBurst = false; // 이번 시퀀스가 지금까지 연타로만 이어졌는가

  function resetSeq() {
    buffer = "";
    isBurst = false;
  }

  return {
    push(key: string, time: number): ScanDetectorResult {
      const gap = time - lastTime;
      lastTime = time;

      if (key === "Enter") {
        if (isBurst && buffer.length >= minLength) {
          const barcode = buffer;
          resetSeq();
          return { barcode, consume: true };
        }
        // 사람 타이핑/짧은 입력 → 스캐너 아님. 기본 동작(폼 제출 등)에 맡김.
        resetSeq();
        return { barcode: null, consume: false };
      }

      // 인쇄 가능한 단일 문자만 버퍼링(바코드는 영숫자). Shift/Tab 등은 무시.
      if (key.length !== 1) return { barcode: null, consume: false };

      if (gap <= maxGapMs && buffer !== "") {
        // 직전 키와 연타 → 버스트 진행 중. 문자를 삼켜 포커스된 입력 오염 방지.
        buffer += key;
        isBurst = true;
        return { barcode: null, consume: true };
      }

      // 간격이 큼 = 새 시퀀스 시작(사람 타이핑의 첫 글자일 수 있음 → 삼키지 않음).
      buffer = key;
      isBurst = false;
      return { barcode: null, consume: false };
    },
  };
}
