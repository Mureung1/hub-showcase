import { Router } from "express";

import {
  sendVerificationEmail,
  verifySmtpConnection,
} from "../services/emailService.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { createAuthToken } from "../services/tokenService.js";
import {
  loginUser,
  registerUser,
  resolveFirebaseLoginEmail,
  syncFirebaseUser,
  updateUserProfile,
  verifyEmailToken,
} from "../services/userService.js";
import { verifyFirebaseIdToken } from "../services/firebaseAuthService.js";

export const authRouter = Router();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidUsername = (username) =>
  /^[A-Za-z0-9]+$/.test(username) &&
  /[A-Za-z]/.test(username) &&
  /\d/.test(username);
const isValidPassword = (password) =>
  password.length >= 6 &&
  /[A-Za-z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);
const isValidUrl = (url) => url.startsWith("http://") || url.startsWith("https://");

const readProfileInput = (body) => ({
  name: String(body.name || "").trim(),
  email: String(body.email || "").trim(),
  school: String(body.school || "").trim(),
  major: String(body.major || "").trim(),
});

const validateProfileInput = ({ name, email, school, major }, response) => {
  if (!name || !school || !major) {
    response.status(400).json({ message: "이름, 학교, 전공을 모두 입력해 주세요." });
    return false;
  }

  if (!isValidEmail(email)) {
    response.status(400).json({ message: "유효한 이메일 주소를 입력해 주세요." });
    return false;
  }

  return true;
};

authRouter.post("/register", async (request, response, next) => {
  try {
    const email = String(request.body.email || "").trim();
    const username = String(request.body.username || "").trim();
    const name = String(request.body.name || "").trim();
    const password = String(request.body.password || "");
    const school = String(request.body.school || "").trim();
    const major = String(request.body.major || "").trim();
    const verificationOrigin = String(request.body.verificationOrigin || "").trim();

    if (!validateProfileInput({ name, email, school, major }, response)) {
      return;
    }

    if (!isValidUsername(username)) {
      response.status(400).json({ message: "아이디는 영문과 숫자를 모두 포함해야 합니다." });
      return;
    }

    if (!isValidPassword(password)) {
      response.status(400).json({
        message: "비밀번호는 6자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다.",
      });
      return;
    }

    if (!isValidUrl(verificationOrigin)) {
      response.status(400).json({ message: "유효한 인증 주소가 필요합니다." });
      return;
    }

    const user = await registerUser({
      email,
      username,
      name,
      password,
      school,
      major,
      verificationOrigin,
    });

    response.status(201).json({ ok: true, user });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (request, response, next) => {
  try {
    const account = String(request.body.account || "").trim();
    const password = String(request.body.password || "");

    if (!account || !password) {
      response.status(400).json({ message: "아이디 또는 이메일과 비밀번호를 입력해 주세요." });
      return;
    }

    const user = await loginUser({ account, password });
    const token = createAuthToken(user);

    response.json({ ok: true, user, token });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/firebase-login-email", async (request, response, next) => {
  try {
    const account = String(request.body.account || "").trim();

    const email = await resolveFirebaseLoginEmail(account);

    response.json({ ok: true, email });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/firebase-profile", async (request, response, next) => {
  try {
    const idToken = String(request.body.idToken || "").trim();
    const username = String(request.body.username || "").trim();
    const name = String(request.body.name || "").trim();
    const school = String(request.body.school || "").trim();
    const major = String(request.body.major || "").trim();

    if (!idToken) {
      response.status(400).json({ message: "Firebase ID token이 필요합니다." });
      return;
    }

    if (!username || !isValidUsername(username)) {
      response.status(400).json({ message: "아이디는 영문과 숫자를 모두 포함해야 합니다." });
      return;
    }

    const decodedToken = await verifyFirebaseIdToken(idToken);
    const email = String(decodedToken.email || "").trim();

    if (!email || !isValidEmail(email)) {
      response.status(400).json({ message: "Firebase 계정 이메일을 확인할 수 없습니다." });
      return;
    }

    const user = await syncFirebaseUser({
      firebaseUid: decodedToken.uid,
      email,
      emailVerified: Boolean(decodedToken.email_verified),
      username,
      name: name || decodedToken.name || email.split("@")[0],
      school,
      major,
    });

    response.json({ ok: true, user });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/firebase-session", async (request, response, next) => {
  try {
    const idToken = String(request.body.idToken || "").trim();
    const username = String(request.body.username || "").trim();
    const name = String(request.body.name || "").trim();
    const school = String(request.body.school || "").trim();
    const major = String(request.body.major || "").trim();

    if (!idToken) {
      response.status(400).json({ message: "Firebase ID token이 필요합니다." });
      return;
    }

    const decodedToken = await verifyFirebaseIdToken(idToken);
    const email = String(decodedToken.email || "").trim();

    if (!email || !isValidEmail(email)) {
      response.status(400).json({ message: "Firebase 계정 이메일을 확인할 수 없습니다." });
      return;
    }

    if (!decodedToken.email_verified) {
      response.status(403).json({ message: "Firebase 이메일 인증을 완료해 주세요." });
      return;
    }

    if (username && !isValidUsername(username)) {
      response.status(400).json({ message: "아이디는 영문과 숫자를 모두 포함해야 합니다." });
      return;
    }

    const user = await syncFirebaseUser({
      firebaseUid: decodedToken.uid,
      email,
      emailVerified: decodedToken.email_verified,
      username: username || decodedToken.uid,
      name: name || decodedToken.name || email.split("@")[0],
      school,
      major,
    });

    response.json({ ok: true, user });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (request, response) => {
  response.json({ ok: true, user: request.user });
});

authRouter.patch("/me", requireAuth, async (request, response, next) => {
  try {
    const profile = readProfileInput(request.body);

    if (!validateProfileInput(profile, response)) {
      return;
    }

    const user = await updateUserProfile({
      userId: request.user.id,
      ...profile,
    });

    response.json({ ok: true, user });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/verify-email", async (request, response, next) => {
  try {
    const token = String(request.body.token || "").trim();

    if (!token) {
      response.status(400).json({ message: "인증 토큰이 필요합니다." });
      return;
    }

    const user = await verifyEmailToken(token);

    if (!user) {
      response.status(400).json({ message: "인증 링크가 유효하지 않거나 만료되었습니다." });
      return;
    }

    response.json({ ok: true, user });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/verification-email", async (request, response, next) => {
  try {
    const email = String(request.body.email || "").trim();
    const name = String(request.body.name || "").trim();
    const verificationUrl = String(request.body.verificationUrl || "").trim();

    if (!isValidEmail(email)) {
      response.status(400).json({ message: "유효한 이메일 주소를 입력해 주세요." });
      return;
    }

    if (!isValidUrl(verificationUrl)) {
      response.status(400).json({ message: "유효한 인증 링크가 필요합니다." });
      return;
    }

    await sendVerificationEmail({
      to: email,
      name,
      verificationUrl,
    });

    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/smtp-status", async (request, response, next) => {
  try {
    await verifySmtpConnection();
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
