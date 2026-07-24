import express from "express";
import {
  syncFinancialStatements,
  getStoredFinancialStatements,
} from "../services/dartFinancialService.js";

const router = express.Router();

router.post("/sync/:stockCode", async (req, res) => {
  try {
    const { stockCode } = req.params;

    if (!stockCode) {
      return res.status(400).json({
        message: "종목코드가 필요합니다.",
      });
    }

    const result = await syncFinancialStatements(stockCode);

    return res.status(200).json({
      message: "재무제표 동기화가 완료되었습니다.",
      data: result,
    });
  } catch (error) {
    console.error("재무제표 동기화 오류:", error);

    return res.status(500).json({
      message: error.message || "재무제표 동기화에 실패했습니다.",
    });
  }
});

router.get("/:stockCode", async (req, res) => {
  try {
    const { stockCode } = req.params;

    if (!stockCode) {
      return res.status(400).json({
        message: "종목코드가 필요합니다.",
      });
    }

    const data = await getStoredFinancialStatements(stockCode);

    return res.status(200).json({
      data,
    });
  } catch (error) {
    console.error("재무제표 조회 오류:", error);

    return res.status(500).json({
      message: error.message || "재무제표 조회에 실패했습니다.",
    });
  }
});

export default router;