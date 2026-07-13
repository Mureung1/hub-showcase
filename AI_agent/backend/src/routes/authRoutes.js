import { Router } from "express";

import { sendVerificationEmail } from "../services/emailService.js";

export const authRouter = Router();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

authRouter.post("/verification-email", async (request, response, next) => {
  try {
    const email = String(request.body.email || "").trim();
    const name = String(request.body.name || "").trim();
    const verificationUrl = String(request.body.verificationUrl || "").trim();

    if (!isValidEmail(email)) {
      response.status(400).json({ message: "유효한 이메일 주소를 입력해 주세요." });
      return;
    }

    if (!verificationUrl.startsWith("http://") && !verificationUrl.startsWith("https://")) {
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
