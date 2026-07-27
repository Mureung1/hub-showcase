import { generatePortfolioHtml } from "../services/anthropic.service.js";
import { ServiceError } from "../errors/ServiceError.js";

// POST /api/generate  { cvMarkdown, designMarkdown, targetMarkdown } -> { html }
export async function postGenerate(req, res, next) {
  try {
    const { cvMarkdown, designMarkdown, targetMarkdown } = req.body ?? {};

    if (typeof cvMarkdown !== "string" || cvMarkdown.trim().length === 0) {
      throw new ServiceError("cvMarkdown 은 비어 있지 않은 문자열이어야 합니다.", 400);
    }
    if (typeof designMarkdown !== "string" || designMarkdown.trim().length === 0) {
      throw new ServiceError(
        "designMarkdown 은 비어 있지 않은 문자열이어야 합니다.",
        400,
      );
    }
    if (typeof targetMarkdown !== "string" || targetMarkdown.trim().length === 0) {
      throw new ServiceError(
        "targetMarkdown는 비어 있지 않은 문자열이어야 합니다.",
        400,
      );
    }

    const html = await generatePortfolioHtml({
      cvMarkdown,
      designMarkdown,
      targetMarkdown,
    });
    res.json({ html });
  } catch (err) {
    next(err);
  }
}
