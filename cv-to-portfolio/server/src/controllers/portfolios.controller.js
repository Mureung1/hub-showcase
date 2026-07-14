import { ServiceError } from "../errors/ServiceError.js";
import {
  createPortfolio,
  getPortfolio,
  listPortfolios,
} from "../services/portfolios.service.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredString(value, field, maxLength) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ServiceError(`${field}은(는) 비어 있지 않은 문자열이어야 합니다.`, 400);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new ServiceError(`${field}은(는) ${maxLength}자 이하여야 합니다.`, 400);
  }
  return normalized;
}

export async function postPortfolio(req, res, next) {
  try {
    const body = req.body ?? {};
    const portfolio = await createPortfolio({
      name: requiredString(body.name, "name", 120),
      title: typeof body.title === "string" ? body.title.trim().slice(0, 160) : "",
      themeSlug: requiredString(body.themeSlug, "themeSlug", 80),
      themeName: requiredString(body.themeName, "themeName", 120),
      html: requiredString(body.html, "html", 300_000),
    });
    res.status(201).json({ portfolio });
  } catch (error) {
    next(error);
  }
}

export async function getPortfolios(req, res, next) {
  try {
    const requested = Number(req.query.limit ?? 10);
    if (!Number.isInteger(requested) || requested < 1 || requested > 20) {
      throw new ServiceError("limit은 1~20 사이의 정수여야 합니다.", 400);
    }
    res.json({ portfolios: await listPortfolios(requested) });
  } catch (error) {
    next(error);
  }
}

export async function getPortfolioById(req, res, next) {
  try {
    if (!UUID_PATTERN.test(req.params.id)) {
      throw new ServiceError("id는 올바른 UUID여야 합니다.", 400);
    }
    res.json({ portfolio: await getPortfolio(req.params.id) });
  } catch (error) {
    next(error);
  }
}
