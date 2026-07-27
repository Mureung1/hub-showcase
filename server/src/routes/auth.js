import { Router } from "express";
import { buildAuthorizeUrl, completeNaverLogin, guessBlogId } from "../services/naverOAuth.js";

const router = Router();

function frontendOrigin() {
  return process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
}

// 브라우저가 그대로 이동하는 경로다(fetch가 아님) — 네이버 로그인 페이지로 리다이렉트.
router.get("/naver", (req, res) => {
  try {
    res.redirect(buildAuthorizeUrl());
  } catch (err) {
    const url = new URL("/onboarding", frontendOrigin());
    url.searchParams.set("naverAuthError", err.code ?? "NAVER_OAUTH_FAILED");
    res.redirect(url.toString());
  }
});

// 네이버가 로그인 후 돌려보내는 콜백. 성공/실패 모두 온보딩 화면으로 다시
// 리다이렉트하고, 결과는 쿼리 파라미터로 실어 보낸다(별도 세션/쿠키 없이 SPA가
// 읽어서 처리).
router.get("/naver/callback", async (req, res) => {
  const { code, state, error } = req.query;
  const redirectUrl = new URL("/onboarding", frontendOrigin());

  if (error) {
    redirectUrl.searchParams.set("naverAuthError", String(error));
    return res.redirect(redirectUrl.toString());
  }

  try {
    const { naverId, nickname } = await completeNaverLogin(code, state);
    const { blogIdCandidate, candidateExists } = await guessBlogId({ naverId, nickname });

    redirectUrl.searchParams.set("naverId", naverId);
    if (blogIdCandidate) redirectUrl.searchParams.set("blogIdCandidate", blogIdCandidate);
    redirectUrl.searchParams.set("candidateExists", String(candidateExists));
  } catch (err) {
    redirectUrl.searchParams.set("naverAuthError", err.code ?? "NAVER_OAUTH_FAILED");
  }

  res.redirect(redirectUrl.toString());
});

export default router;
