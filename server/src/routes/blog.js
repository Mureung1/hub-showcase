import { Router } from "express";
import { getBlogAnalysis } from "../services/blogAnalysisService.js";

const router = Router();

// blogId 확보는 온보딩의 네이버 로그인(OAuth) 흐름(routes/auth.js)이 전담한다.
// 여기는 이미 연동된 블로그의 운영 데이터 조회만 다룬다.
router.get("/analysis", async (req, res) => {
  res.json(await getBlogAnalysis());
});

export default router;
