// AI 라우트 남용 완화 — 같은 오리진 검사 + 인메모리 레이트리밋.
// ⚠️ 인메모리는 서버리스 인스턴스별이라 완벽하지 않다. 강한 보호는 Upstash 등 공유 저장소 + App Check.
import { NextRequest } from "next/server";

/** 브라우저의 같은 오리진 요청만 허용(타 사이트 임베드 차단). Origin 없으면(직접 접근) 통과 → 레이트리밋으로 방어. */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

const hits = new Map<string, number[]>();

/** IP+키 기준 슬라이딩 윈도 레이트리밋. 초과 시 false. */
export function rateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  // 메모리 누수 방지: 가끔 오래된 키 정리
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return true;
}
