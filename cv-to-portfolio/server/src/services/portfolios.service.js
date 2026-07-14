import { config, isSupabaseConfigured } from "../config/env.js";
import { ServiceError } from "../errors/ServiceError.js";

const TABLE = "portfolios";
const META_COLUMNS = "id,name,title,theme_slug,theme_name,created_at";
const DETAIL_COLUMNS = `${META_COLUMNS},html`;
const REQUEST_TIMEOUT_MS = 8000;

function mapRow(row, includeHtml = false) {
  const portfolio = {
    id: row.id,
    name: row.name,
    title: row.title || "",
    themeSlug: row.theme_slug,
    themeName: row.theme_name,
    createdAt: row.created_at,
  };

  if (includeHtml) portfolio.html = row.html;
  return portfolio;
}

function headers(prefer) {
  const key = config.supabase.secretKey;
  const result = {
    apikey: key,
    "content-type": "application/json",
  };

  // 기존 service_role JWT는 Authorization 헤더가 필요하다.
  // 새로운 sb_secret_* 키는 Supabase 권고대로 apikey 헤더에만 둔다.
  if (!key.startsWith("sb_secret_")) result.authorization = `Bearer ${key}`;
  if (prefer) result.prefer = prefer;
  return result;
}

async function request(path, options = {}, fetchImpl = globalThis.fetch) {
  if (!isSupabaseConfigured()) {
    throw new ServiceError(
      "포트폴리오 저장소가 구성되지 않았습니다. Supabase 환경 변수를 설정하세요.",
      503,
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchImpl(`${config.supabase.url}${path}`, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new ServiceError("Supabase 요청에 실패했습니다.", 502, {
        cause: new Error(`${response.status}: ${detail}`),
      });
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    const message =
      error?.name === "AbortError"
        ? "Supabase 요청 시간이 초과됐습니다."
        : "Supabase에 연결할 수 없습니다.";
    throw new ServiceError(message, 502, { cause: error });
  } finally {
    clearTimeout(timer);
  }
}

export async function createPortfolio(input, fetchImpl) {
  const rows = await request(
    `/rest/v1/${TABLE}?select=${DETAIL_COLUMNS}`,
    {
      method: "POST",
      headers: headers("return=representation"),
      body: JSON.stringify({
        name: input.name,
        title: input.title,
        theme_slug: input.themeSlug,
        theme_name: input.themeName,
        html: input.html,
      }),
    },
    fetchImpl,
  );

  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new ServiceError("Supabase 저장 응답 형식이 올바르지 않습니다.", 502);
  }

  return mapRow(rows[0], true);
}

export async function listPortfolios(limit = 10, fetchImpl) {
  const rows = await request(
    `/rest/v1/${TABLE}?select=${META_COLUMNS}&order=created_at.desc&limit=${limit}`,
    { headers: headers() },
    fetchImpl,
  );

  if (!Array.isArray(rows)) {
    throw new ServiceError("Supabase 목록 응답 형식이 올바르지 않습니다.", 502);
  }

  return rows.map((row) => mapRow(row));
}

export async function getPortfolio(id, fetchImpl) {
  const rows = await request(
    `/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}&select=${DETAIL_COLUMNS}&limit=1`,
    { headers: headers() },
    fetchImpl,
  );

  if (!Array.isArray(rows)) {
    throw new ServiceError("Supabase 상세 응답 형식이 올바르지 않습니다.", 502);
  }
  if (rows.length === 0)
    throw new ServiceError("저장된 포트폴리오를 찾을 수 없습니다.", 404);

  return mapRow(rows[0], true);
}
