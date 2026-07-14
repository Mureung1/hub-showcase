import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const keyLength = 64;

export const hashPassword = async (password) => {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, keyLength);

  return `${salt}:${derivedKey.toString("hex")}`;
};

export const verifyPassword = async (password, passwordHash) => {
  const [salt, storedKey] = String(passwordHash || "").split(":");

  if (!salt || !storedKey) {
    return false;
  }

  const storedBuffer = Buffer.from(storedKey, "hex");
  const derivedKey = await scrypt(password, salt, storedBuffer.length);

  return timingSafeEqual(storedBuffer, derivedKey);
};
