// 계정 인증 — scrypt 비번 해시(내장 crypto), opaque 세션 토큰 쿠키.
import { cookies } from "next/headers";
import { scrypt, randomBytes, timingSafeEqual, randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { getDeviceId } from "./device";
import { findSessionUser, insertSession, deleteSession } from "../db/auth-repo";

const scryptAsync = promisify(scrypt);
const SESSION_COOKIE = "uncoach_session";
const SESSION_DAYS = 90;

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(pw, salt, 64)) as Buffer;
  return `${salt}:${buf.toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const buf = (await scryptAsync(pw, salt, 64)) as Buffer;
  const hashBuf = Buffer.from(hash, "hex");
  return buf.length === hashBuf.length && timingSafeEqual(buf, hashBuf);
}

export function newUserId(): string {
  return randomUUID();
}

/** 세션 생성 + 쿠키 설정 */
export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await insertSession(token, userId, expires);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

/** 세션 종료 + 쿠키 제거 */
export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await deleteSession(token);
    } catch {}
    jar.delete(SESSION_COOKIE);
  }
}

/** 현재 로그인한 사용자(세션 유효 시) 또는 null */
export async function getSessionUser(): Promise<{ id: string; email: string } | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await findSessionUser(token);
  } catch {
    return null;
  }
}

/** 상태 저장 주체 — 로그인 시 계정, 아니면 기기 */
export async function getOwnerId(): Promise<string> {
  const user = await getSessionUser();
  if (user) return `u:${user.id}`;
  return await getDeviceId();
}
