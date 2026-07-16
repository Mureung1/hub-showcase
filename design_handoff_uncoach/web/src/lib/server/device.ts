// 기기 식별 — 로그인 없이 device_id 쿠키로 상태를 계정처럼 유지.
// (실제 인증은 나중에 이 device_id를 user_id로 매핑해 얹을 수 있음.)
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';

const COOKIE = 'uncoach_device';
const ONE_YEAR = 60 * 60 * 24 * 365;

/** 요청의 device_id를 반환. 없으면 생성해 쿠키에 심는다(라우트 핸들러에서 호출). */
export async function getDeviceId(): Promise<string> {
  const jar = await cookies();
  let id = jar.get(COOKIE)?.value;
  if (!id) {
    id = randomUUID();
    jar.set(COOKIE, id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: ONE_YEAR,
    });
  }
  return id;
}
