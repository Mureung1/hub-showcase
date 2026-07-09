import { generatePortfolioHtml, ServiceError } from "../services/anthropic.service.js";

// POST /api/generate  { cvMarkdown, designMarkdown } -> { html }
export async function postGenerate(req, res, next) {
  try {
    const { cvMarkdown, designMarkdown } = req.body ?? {};

    if (typeof cvMarkdown !== "string" || cvMarkdown.trim().length === 0) {
      throw new ServiceError("cvMarkdown 은 비어 있지 않은 문자열이어야 합니다.", 400);
    }
    if (typeof designMarkdown !== "string" || designMarkdown.trim().length === 0) {
      throw new ServiceError("designMarkdown 은 비어 있지 않은 문자열이어야 합니다.", 400);
    }

    const html = await generatePortfolioHtml({ cvMarkdown, designMarkdown });
    res.json({ html });
  } catch (err) {
    next(err);
  }
}
