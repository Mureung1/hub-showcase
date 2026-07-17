import { analyzeNotice } from "../services/analysisService.js";

export async function analyzeNoticeHandler(req, res) {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "분석할 텍스트를 입력해주세요.",
      });
    }

    const analysisResult = await analyzeNotice(text);

    return res.status(200).json({
      success: true,
      data: analysisResult,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "분석 중 오류가 발생했습니다.",
    });
  }
}
