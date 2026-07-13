// 스캔 세션의 진짜 상태는 lines[] 배열(단일 슬롯 금지). 스캔은 append 스트림.
//   'ready'   = 등록된 상품(정식 line)
//   'pending' = 미등록이라 등록이 필요한 행(등록대기). name/category는 등록 전까지 빈 값.
export type LineStatus = "pending" | "ready";

// 세션은 입고 또는 출고 — 세션당 한 번 정해지는 상태(line마다 토글 아님).
export type SessionMode = "inbound" | "outbound";

export interface ScanLine {
  /** line 식별자 (barcode와 별개 — 같은 상품이 여러 line일 일은 없지만 key/조작용) */
  id: string;
  barcode: string;
  productName: string;
  category: string;
  quantity: number;
  status: LineStatus;
}
