import { randomUUID } from "node:crypto";

import { prisma } from "../db/prisma.js";
import { sendVerificationEmail } from "./emailService.js";
import { hashPassword, verifyPassword } from "./passwordService.js";

const verificationTokenTtlMs = 1000 * 60 * 60 * 24;

const publicUserFields = (user) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  name: user.name,
  school: user.school,
  major: user.major,
  emailVerified: user.emailVerified,
  verifiedAt: user.verifiedAt,
});

export const registerUser = async ({
  email,
  username,
  name,
  password,
  school,
  major,
  verificationOrigin,
}) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim();
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { username: normalizedUsername }],
    },
  });

  if (existingUser) {
    throw new Error("이미 가입했거나 인증 대기 중인 이메일/아이디입니다.");
  }

  const verificationToken = randomUUID();
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      username: normalizedUsername,
      name: name.trim(),
      passwordHash,
      school: school?.trim() || null,
      major: major?.trim() || null,
      verificationToken,
      verificationTokenExpiresAt: new Date(Date.now() + verificationTokenTtlMs),
    },
  });

  const verificationUrl = `${verificationOrigin}/verify-email?token=${verificationToken}`;

  try {
    await sendVerificationEmail({
      to: normalizedEmail,
      name: user.name,
      verificationUrl,
    });
  } catch (error) {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    throw error;
  }

  return publicUserFields(user);
};

export const verifyEmailToken = async (token) => {
  const user = await prisma.user.findUnique({
    where: { verificationToken: token.trim() },
  });

  if (!user || !user.verificationTokenExpiresAt || user.verificationTokenExpiresAt < new Date()) {
    return null;
  }

  const verifiedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verifiedAt: new Date(),
      verificationToken: null,
      verificationTokenExpiresAt: null,
    },
  });

  return publicUserFields(verifiedUser);
};

export const loginUser = async ({ account, password }) => {
  const normalizedAccount = account.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedAccount }, { username: account.trim() }],
    },
  });

  if (!user) {
    throw new Error("가입된 계정을 찾을 수 없습니다.");
  }

  if (!user.emailVerified) {
    throw new Error("이메일 인증이 완료되어야 로그인할 수 있습니다.");
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    throw new Error("비밀번호가 일치하지 않습니다.");
  }

  return publicUserFields(user);
};

export const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  return user ? publicUserFields(user) : null;
};
