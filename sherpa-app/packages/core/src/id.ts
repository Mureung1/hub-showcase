// 공유 유틸 — 레코드 생성 시 ID/타임스탬프를 한 곳에서 만든다.
// PK 전략(클라이언트 UUID)을 web/mobile이 동일하게 쓰도록 core에 둔다.

/** 클라이언트에서 레코드 PK를 생성한다. IndexedDB↔MySQL 매핑 유지용. */
export function newId(): string {
  return crypto.randomUUID();
}

/** epoch ms. createdAt/updatedAt/inboundAt 공통 시각 소스. */
export function now(): number {
  return Date.now();
}
