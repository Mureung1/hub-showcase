import type { Product } from "@sherpa/core";

// 스캔 결과 상태 — 조회는 두 갈래로만 갈라진다(허브 노드).
export type ScanState =
  | { status: "idle" }
  | { status: "found"; product: Product }
  | { status: "notFound"; barcode: string };

interface ScanResultProps {
  state: ScanState;
}

/**
 * 상태는 색 단독이 아니라 '색 + 텍스트'로 전달한다.
 * 등록됨 → fresh 초록 액센트 / 미등록 → amber 액센트(주의).
 * 재고·Lot 상세, 등록 폼은 이번 Slice 범위 밖 → '다음 단계'로만 표기.
 */
export function ScanResult({ state }: ScanResultProps) {
  if (state.status === "idle") {
    return (
      <p className="result-idle">바코드를 스캔하면 여기에 조회 결과가 표시됩니다.</p>
    );
  }

  if (state.status === "found") {
    const { product } = state;
    return (
      <article className="result-card result-card--found" aria-live="polite">
        <span className="result-tag result-tag--found">등록된 상품</span>
        <h2 className="result-name">{product.name}</h2>
        <p className="result-barcode">{product.barcode}</p>
        <p className="result-next">재고·유통기한(Lot) 조회 — 다음 단계</p>
      </article>
    );
  }

  return (
    <article className="result-card result-card--notfound" aria-live="polite">
      <span className="result-tag result-tag--notfound">미등록 상품</span>
      <p className="result-barcode result-barcode--lead">{state.barcode}</p>
      <p className="result-next">상품 등록 — 다음 단계</p>
    </article>
  );
}
