import { newId, now, type Lot } from "@sherpa/core";
import { lotRepository } from "../repository/DexieLotRepository";
import type { ScanLine, SessionMode } from "./types";

export interface CommitResult {
  itemCount: number;
  totalQuantity: number;
}

// 세션 누적 → 커밋 시 단일 반영. 전제: 모든 line이 ready(호출부에서 pending이면 커밋 불가).
//
// 입고: 각 라인을 새 Lot으로 만들어 로컬 원장에 반영한다(재고 += 수량은 Lot 합의 파생값 → §3).
// 출고: FEFO 차감은 Slice 2 범위 → 지금은 아무 것도 쓰지 않는 stub(세션 리셋만 호출부에서).
export async function commitSession(
  mode: SessionMode,
  lines: ScanLine[]
): Promise<CommitResult> {
  const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);

  if (mode === "inbound") {
    const t = now();
    const lots: Lot[] = lines.map((l) => ({
      id: newId(),
      productId: l.productId,
      expiryDate: l.expiryDate,
      quantity: l.quantity,
      inboundAt: t,
      updatedAt: t,
    }));
    await lotRepository.saveMany(lots);
  }

  return { itemCount: lines.length, totalQuantity };
}
