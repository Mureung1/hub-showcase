import type { ScanLine, SessionMode } from "./types";

export interface CommitResult {
  itemCount: number;
  totalQuantity: number;
}

// 원자적 커밋 stub — "세션 누적 → 커밋 시 단일 트랜잭션 반영"이라는 계약만 표현한다.
// 실제 재고 반영(입고=새 Lot 생성·재고+, 출고=FEFO 차감·재고−)은 이 화면 범위 밖(다음 단계).
// 지금은 아무 것도 쓰지 않는다. 전제: 모든 line이 ready(호출부에서 pending이면 커밋 불가).
export async function commitSession(
  _mode: SessionMode,
  lines: ScanLine[]
): Promise<CommitResult> {
  const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);
  return { itemCount: lines.length, totalQuantity };
}
