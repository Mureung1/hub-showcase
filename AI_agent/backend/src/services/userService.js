import { randomUUID } from "node:crypto";

import { prisma } from "../db/prisma.js";
import { sendVerificationEmail } from "./emailService.js";
import { hashPassword, verifyPassword } from "./passwordService.js";

const verificationTokenTtlMs = 1000 * 60 * 60 * 24;

const createHttpError = (message, statusCode, details) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
};

const publicUserFields = (user) => ({
  id: user.id,
  firebaseUid: user.firebaseUid,
  email: user.email,
  username: user.username,
  name: user.name,
  school: user.school,
  major: user.major,
  emailVerified: user.emailVerified,
  verifiedAt: user.verifiedAt,
});

export const assertRegistrationAvailable = async ({ email, username }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedUsername = String(username || "").trim();

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { username: normalizedUsername }],
    },
  });

  if (existingUser) {
    throw createHttpError("이미 사용 중인 이메일 또는 아이디입니다.", 409);
  }
};

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
    throw createHttpError("이미 가입했거나 인증 대기 중인 이메일 또는 아이디입니다.", 409);
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

export const syncFirebaseUser = async ({
  firebaseUid,
  email,
  emailVerified,
  username,
  name,
  school,
  major,
}) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedUsername = String(username || "").trim();
  const existingByFirebaseUid = await prisma.user.findUnique({
    where: { firebaseUid },
  });

  if (existingByFirebaseUid) {
    const updatedUser = await prisma.user.update({
      where: { id: existingByFirebaseUid.id },
      data: {
        email: normalizedEmail || existingByFirebaseUid.email,
        name: String(name || existingByFirebaseUid.name).trim(),
        school: String(school || existingByFirebaseUid.school || "").trim() || null,
        major: String(major || existingByFirebaseUid.major || "").trim() || null,
        emailVerified: Boolean(emailVerified),
        verifiedAt: emailVerified
          ? existingByFirebaseUid.verifiedAt || new Date()
          : existingByFirebaseUid.verifiedAt,
      },
    });

    return publicUserFields(updatedUser);
  }

  const existingByEmail = normalizedEmail
    ? await prisma.user.findUnique({ where: { email: normalizedEmail } })
    : null;
  const existingByUsername = normalizedUsername
    ? await prisma.user.findUnique({ where: { username: normalizedUsername } })
    : null;

  const existingUser = existingByEmail || existingByUsername;

  if (
    existingByUsername &&
    existingByEmail &&
    existingByUsername.id !== existingByEmail.id
  ) {
    throw createHttpError("이미 사용 중인 이메일 또는 아이디입니다.", 409);
  }

  if (existingByUsername && !existingByEmail) {
    throw createHttpError("이미 사용 중인 이메일 또는 아이디입니다.", 409);
  }

  if (existingUser?.email === normalizedEmail) {
    existingUser.firebaseUid = firebaseUid;
  }

  if (existingUser && existingUser.firebaseUid && existingUser.firebaseUid !== firebaseUid) {
    throw createHttpError("이미 사용 중인 이메일 또는 아이디입니다.", 409);
  }

  if (existingUser) {
    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        firebaseUid,
        emailVerified: Boolean(emailVerified),
        verifiedAt: emailVerified ? existingUser.verifiedAt || new Date() : existingUser.verifiedAt,
        name: String(name || existingUser.name).trim(),
        school: String(school || existingUser.school || "").trim() || null,
        major: String(major || existingUser.major || "").trim() || null,
      },
    });

    return publicUserFields(updatedUser);
  }

  const user = await prisma.user.create({
    data: {
      firebaseUid,
      email: normalizedEmail,
      username: normalizedUsername,
      name: String(name || "").trim(),
      passwordHash: "",
      school: String(school || "").trim() || null,
      major: String(major || "").trim() || null,
      emailVerified: Boolean(emailVerified),
      verifiedAt: emailVerified ? new Date() : null,
    },
  });

  return publicUserFields(user);
};

export const resolveFirebaseLoginEmail = async (account) => {
  const trimmedAccount = String(account || "").trim();
  const normalizedAccount = trimmedAccount.toLowerCase();

  if (!trimmedAccount) {
    throw createHttpError("로그인 계정을 입력해 주세요.", 400);
  }

  if (normalizedAccount.includes("@")) {
    return normalizedAccount;
  }

  const user = await prisma.user.findFirst({
    where: { username: trimmedAccount },
    select: { email: true },
  });

  if (!user) {
    throw createHttpError("가입된 계정을 찾을 수 없습니다.", 404);
  }

  return user.email;
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
    throw createHttpError("가입된 계정을 찾을 수 없습니다.", 401);
  }

  if (!user.emailVerified) {
    throw createHttpError("이메일 인증을 완료해야 로그인할 수 있습니다.", 403);
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    throw createHttpError("비밀번호가 일치하지 않습니다.", 401);
  }

  return publicUserFields(user);
};

export const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  return user ? publicUserFields(user) : null;
};

export const getUserByFirebaseUid = async (firebaseUid) => {
  const user = await prisma.user.findUnique({
    where: { firebaseUid },
  });

  return user ? publicUserFields(user) : null;
};

export const updateUserProfile = async ({ userId, name, email, school, major }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      NOT: { id: userId },
    },
  });

  if (existingUser) {
    throw createHttpError("이미 사용 중인 이메일입니다.", 409);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name: name.trim(),
      email: normalizedEmail,
      school: school.trim(),
      major: major.trim(),
    },
  });

  return publicUserFields(updatedUser);
};
