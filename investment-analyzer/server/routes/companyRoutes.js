import express from "express";

import {
  getStoredCompanies,
  syncAllCompanies,
} from "../services/companySyncService.js";

const router = express.Router();

/**
 * 전체 기업 동기화
 * POST /api/companies/sync
 */
router.post("/sync", async (req, res) => {
  try {
    const result = await syncAllCompanies();

    res.json(result);
  } catch (error) {
    console.error("기업 동기화 오류:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * 기업 검색
 * GET /api/companies?keyword=삼성&market=KOSPI&limit=20
 */
router.get("/", async (req, res) => {
  try {
    const companies = await getStoredCompanies({
      keyword: String(req.query.keyword ?? ""),
      market: String(req.query.market ?? ""),
      limit: req.query.limit,
    });

    res.json({
      success: true,
      count: companies.length,
      companies,
    });
  } catch (error) {
    console.error("기업 목록 조회 오류:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;