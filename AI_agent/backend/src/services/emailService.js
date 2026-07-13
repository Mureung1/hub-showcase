import nodemailer from "nodemailer";

import { env } from "../config/env.js";

const hasSmtpConfig = () =>
  Boolean(env.smtpHost && env.smtpUser && env.smtpPass && env.smtpFrom);

const createTransporter = () => {
  if (!hasSmtpConfig()) {
    throw new Error("SMTP 설정이 필요합니다. backend/.env의 SMTP 값을 입력해 주세요.");
  }

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });
};

export const sendVerificationEmail = async ({ to, name, verificationUrl }) => {
  const transporter = createTransporter();
  const displayName = name || "사용자";

  await transporter.sendMail({
    from: env.smtpFrom,
    to,
    subject: "[Career Mission AI] 이메일 인증을 완료해 주세요",
    text: [
      `${displayName}님, Career Mission AI 회원가입을 완료하려면 아래 링크를 열어 주세요.`,
      "",
      verificationUrl,
      "",
      "본인이 요청하지 않았다면 이 메일을 무시해도 됩니다.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2 style="margin: 0 0 12px;">Career Mission AI 이메일 인증</h2>
        <p>${displayName}님, 회원가입을 완료하려면 아래 버튼을 눌러 주세요.</p>
        <p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 999px; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700;">
            이메일 인증하기
          </a>
        </p>
        <p style="font-size: 13px; color: #64748b;">
          버튼이 열리지 않으면 아래 링크를 브라우저 주소창에 붙여넣어 주세요.<br />
          <a href="${verificationUrl}">${verificationUrl}</a>
        </p>
      </div>
    `,
  });
};
