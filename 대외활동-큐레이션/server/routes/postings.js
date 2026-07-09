// 조회 API. 프로필을 받아 가능, 불가, 확인 필요로 나눠준다.
// 매칭 규칙은 docs/schema.md 핵심 규칙 (포함관계, 안 고름은 계산 제외, 나이 포함).
import { Router } from "express";

const router = Router();

// GET /postings?grade=3&major=IT&region=서울&...
// 응답: { eligible, review, ineligible, page }
router.get("/", async (req, res) => {
  // TODO(5): postings 완성본을 불러와 프로필과 매칭.
  // 프로토타입은 서버 메모리에서 필터, 데이터가 커지면 Postgres JSONB 조건 쿼리로.
  res.json({ eligible: [], review: [], ineligible: [], page: 1 });
});

// GET /postings/:id  상세 (원문 근거 포함)
router.get("/:id", async (req, res) => {
  // TODO(5)
  res.json({});
});

export default router;
