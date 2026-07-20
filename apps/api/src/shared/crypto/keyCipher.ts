import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

import { loadEnv } from "../config/env.js";

/**
 * BYOK 사용자 키 암호화 (SPEC-DB-001 3장). 앱 레벨 AES-256-GCM.
 * - 마스터 키 = env `AI_KEY_ENCRYPTION_KEY`(base64 32바이트, 서버 시작 시 검증됨).
 * - 암호화마다 난수 IV, GCM 인증 태그로 위변조를 감지한다.
 * - 평문 키는 저장·프론트·로그·에러 어디에도 두지 않는다(암호문·IV·태그만 저장).
 * - 복호는 서버에서만, 사용 시점(AI Spec)에.
 */
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

function masterKey(): Buffer {
  const key = Buffer.from(loadEnv().AI_KEY_ENCRYPTION_KEY, "base64");
  // env.ts가 32바이트를 보장하나 방어적으로 재확인한다(오류 메시지에 키 값은 넣지 않는다).
  if (key.length !== 32) {
    throw new Error("암호화 마스터 키 길이가 올바르지 않습니다(32바이트 필요).");
  }
  return key;
}

/** 저장 형태 — 모두 base64 문자열. DB의 encrypted_key·key_iv·key_auth_tag 에 대응. */
export interface EncryptedSecret {
  encryptedKey: string;
  keyIv: string;
  keyAuthTag: string;
}

export function encryptSecret(plaintext: string): EncryptedSecret {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, masterKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return {
    encryptedKey: ciphertext.toString("base64"),
    keyIv: iv.toString("base64"),
    keyAuthTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptSecret(secret: EncryptedSecret): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    masterKey(),
    Buffer.from(secret.keyIv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(secret.keyAuthTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(secret.encryptedKey, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
