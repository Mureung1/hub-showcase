// 경계 검증 — PUT /api/state로 들어오는 신뢰불가 입력을 유효한 AppStateBlob으로 정규화.
// 스펙(SDD): profile은 평범한 객체면 유지·아니면 null, history/assets/customSits는 배열이면 유지·아니면 [].
// 알 수 없는 키는 버린다. 레코드 내부 필드 深검증은 범위 밖(출처가 자체 클라이언트 — 컨테이너 타입만 보증).
// ponytail: 필요해지면 레코드 단위 검증(zod 등)으로 확장.
import type { AppStateBlob, Profile } from './types';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export function sanitizeBlob(raw: unknown): AppStateBlob {
  const o = isPlainObject(raw) ? raw : {};
  return {
    profile: isPlainObject(o.profile) ? (o.profile as unknown as Profile) : null,
    history: arr(o.history),
    assets: arr(o.assets),
    customSits: arr(o.customSits),
  };
}
