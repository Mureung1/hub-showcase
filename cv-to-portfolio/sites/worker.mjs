const TABLE = "portfolios";
const META_COLUMNS = "id,name,title,theme_slug,theme_name,is_favorite,created_at";
const DETAIL_COLUMNS = `${META_COLUMNS},html`;
const LEGACY_META_COLUMNS = "id,name,title,theme_slug,theme_name,created_at";
const LEGACY_DETAIL_COLUMNS = `${LEGACY_META_COLUMNS},html`;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class HttpError extends Error {
  constructor(message, status = 500, detail = "") {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.detail = detail;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function requiredString(value, field, maxLength) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(`${field}은(는) 비어 있지 않은 문자열이어야 합니다.`, 400);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new HttpError(`${field}은(는) ${maxLength}자 이하여야 합니다.`, 400);
  }
  return normalized;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError("요청 본문은 올바른 JSON이어야 합니다.", 400);
  }
}

function supabaseConfigured(env) {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SECRET_KEY);
}

function anthropicConfigured(env) {
  const key = env.ANTHROPIC_API_KEY || "";
  return key.startsWith("sk-ant-") && key.length >= 32;
}

function supabaseHeaders(env, prefer) {
  const key = env.SUPABASE_SECRET_KEY;
  const headers = {
    apikey: key,
    "content-type": "application/json",
  };
  if (!key.startsWith("sb_secret_")) headers.authorization = `Bearer ${key}`;
  if (prefer) headers.prefer = prefer;
  return headers;
}

async function supabaseRequest(env, path, options = {}) {
  if (!supabaseConfigured(env)) {
    throw new HttpError(
      "포트폴리오 저장소가 구성되지 않았습니다. Supabase 환경 변수를 설정하세요.",
      503,
    );
  }

  let response;
  try {
    response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}${path}`, options);
  } catch (error) {
    throw new HttpError("Supabase에 연결할 수 없습니다.", 502, String(error));
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new HttpError("Supabase 요청에 실패했습니다.", 502, detail);
  }

  return response.json();
}

function missingFavoriteColumn(error) {
  return (
    error instanceof HttpError &&
    error.detail.includes("42703") &&
    error.detail.includes("is_favorite")
  );
}

async function supabaseWithLegacyColumns(env, path, legacyPath, options = {}) {
  try {
    return await supabaseRequest(env, path, options);
  } catch (error) {
    if (!missingFavoriteColumn(error)) throw error;
    return supabaseRequest(env, legacyPath, options);
  }
}

function mapPortfolio(row, includeHtml = false) {
  const portfolio = {
    id: row.id,
    name: row.name,
    title: row.title || "",
    themeSlug: row.theme_slug,
    themeName: row.theme_name,
    isFavorite: Boolean(row.is_favorite),
    createdAt: row.created_at,
  };
  if (includeHtml) portfolio.html = row.html;
  return portfolio;
}

function buildPortfolioPrompt({ cvMarkdown, designMarkdown, targetMarkdown }) {
  return [
    "너는 채용 포트폴리오를 만드는 프론트엔드 개발자다.",
    "지원 목표와 이력서(CV)를 분석해 DESIGN.md 지침에 맞는 완성된 독립 실행형 HTML 포트폴리오 하나를 만들어라.",
    "- 지원 기업의 인재상과 JD에 관련된 실제 경험을 앞에 배치하고 구체적인 근거가 잘 보이게 표현한다.",
    "- CV에 없는 경력, 수치, 기술, 성과를 절대 만들지 않는다. 근거가 없으면 생략한다.",
    "- JD 문구를 그대로 복사하지 말고 CV의 사실을 지원 직무 관점에서 재구성한다.",
    "- 외부 CSS 프레임워크 없이 <style>의 인라인 CSS만 사용한다.",
    "- DESIGN.md의 팔레트, 타이포, 레이아웃을 충실히 반영한다.",
    "- 설명 없이 완결된 <!doctype html> 문서만 출력한다.",
    "",
    "=== 지원 목표와 JD 요약 ===",
    targetMarkdown,
    "",
    "=== CV ===",
    cvMarkdown,
    "",
    "=== DESIGN.md ===",
    designMarkdown,
  ].join("\n");
}

async function generatePortfolio(env, request) {
  const body = await readJson(request);
  const cvMarkdown = requiredString(body.cvMarkdown, "cvMarkdown", 120_000);
  const designMarkdown = requiredString(
    body.designMarkdown,
    "designMarkdown",
    40_000,
  );
  const targetMarkdown = requiredString(
    body.targetMarkdown,
    "targetMarkdown",
    20_000,
  );

  if (!anthropicConfigured(env)) {
    throw new HttpError("AI 생성이 구성되지 않았습니다.", 503);
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: buildPortfolioPrompt({
            cvMarkdown,
            designMarkdown,
            targetMarkdown,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new HttpError("AI 생성 서버가 응답하지 않았습니다.", 502, detail);
  }

  const data = await response.json();
  const html = (data.content || []).map((block) => block.text || "").join("");
  if (!html.trim()) throw new HttpError("AI 생성 응답에 HTML이 없습니다.", 502);
  return json({ html });
}

async function createPortfolio(env, request) {
  const body = await readJson(request);
  const input = {
    name: requiredString(body.name, "name", 120),
    title: typeof body.title === "string" ? body.title.trim().slice(0, 160) : "",
    themeSlug: requiredString(body.themeSlug, "themeSlug", 80),
    themeName: requiredString(body.themeName, "themeName", 120),
    html: requiredString(body.html, "html", 300_000),
  };
  const options = {
    method: "POST",
    headers: supabaseHeaders(env, "return=representation"),
    body: JSON.stringify({
      name: input.name,
      title: input.title,
      theme_slug: input.themeSlug,
      theme_name: input.themeName,
      html: input.html,
    }),
  };
  const rows = await supabaseWithLegacyColumns(
    env,
    `/rest/v1/${TABLE}?select=${DETAIL_COLUMNS}`,
    `/rest/v1/${TABLE}?select=${LEGACY_DETAIL_COLUMNS}`,
    options,
  );
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new HttpError("Supabase 저장 응답 형식이 올바르지 않습니다.", 502);
  }
  return json({ portfolio: mapPortfolio(rows[0], true) }, 201);
}

async function listPortfolios(env, url) {
  const limit = Number(url.searchParams.get("limit") ?? 10);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new HttpError("limit은 1~20 사이의 정수여야 합니다.", 400);
  }
  const rows = await supabaseWithLegacyColumns(
    env,
    `/rest/v1/${TABLE}?select=${META_COLUMNS}&order=created_at.desc&limit=${limit}`,
    `/rest/v1/${TABLE}?select=${LEGACY_META_COLUMNS}&order=created_at.desc&limit=${limit}`,
    { headers: supabaseHeaders(env) },
  );
  if (!Array.isArray(rows)) {
    throw new HttpError("Supabase 목록 응답 형식이 올바르지 않습니다.", 502);
  }
  return json({ portfolios: rows.map((row) => mapPortfolio(row)) });
}

async function getPortfolio(env, id) {
  if (!UUID_PATTERN.test(id)) throw new HttpError("id는 올바른 UUID여야 합니다.", 400);
  const encoded = encodeURIComponent(id);
  const rows = await supabaseWithLegacyColumns(
    env,
    `/rest/v1/${TABLE}?id=eq.${encoded}&select=${DETAIL_COLUMNS}&limit=1`,
    `/rest/v1/${TABLE}?id=eq.${encoded}&select=${LEGACY_DETAIL_COLUMNS}&limit=1`,
    { headers: supabaseHeaders(env) },
  );
  if (!Array.isArray(rows)) {
    throw new HttpError("Supabase 상세 응답 형식이 올바르지 않습니다.", 502);
  }
  if (rows.length === 0) {
    throw new HttpError("저장된 포트폴리오를 찾을 수 없습니다.", 404);
  }
  return json({ portfolio: mapPortfolio(rows[0], true) });
}

async function updateFavorite(env, id, request) {
  if (!UUID_PATTERN.test(id)) throw new HttpError("id는 올바른 UUID여야 합니다.", 400);
  const body = await readJson(request);
  if (typeof body.isFavorite !== "boolean") {
    throw new HttpError("isFavorite은 boolean이어야 합니다.", 400);
  }
  const rows = await supabaseRequest(
    env,
    `/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}&select=${DETAIL_COLUMNS}`,
    {
      method: "PATCH",
      headers: supabaseHeaders(env, "return=representation"),
      body: JSON.stringify({ is_favorite: body.isFavorite }),
    },
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new HttpError("저장된 포트폴리오를 찾을 수 없습니다.", 404);
  }
  return json({ portfolio: mapPortfolio(rows[0], true) });
}

async function handleApi(request, env, url) {
  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({
      status: "ok",
      aiConfigured: anthropicConfigured(env),
      databaseConfigured: supabaseConfigured(env),
    });
  }
  if (url.pathname === "/api/generate" && request.method === "POST") {
    return generatePortfolio(env, request);
  }
  if (url.pathname === "/api/portfolios" && request.method === "POST") {
    return createPortfolio(env, request);
  }
  if (url.pathname === "/api/portfolios" && request.method === "GET") {
    return listPortfolios(env, url);
  }

  const favoriteMatch = url.pathname.match(
    /^\/api\/portfolios\/([^/]+)\/favorite$/,
  );
  if (favoriteMatch && request.method === "PATCH") {
    return updateFavorite(env, favoriteMatch[1], request);
  }
  const detailMatch = url.pathname.match(/^\/api\/portfolios\/([^/]+)$/);
  if (detailMatch && request.method === "GET") {
    return getPortfolio(env, detailMatch[1]);
  }
  throw new HttpError("Not Found", 404);
}

async function serveAsset(request, env, url) {
  const assetUrl = new URL(url);
  if (assetUrl.pathname === "/") assetUrl.pathname = "/index.html";
  let response = await env.ASSETS.fetch(new Request(assetUrl, request));

  if (
    response.status === 404 &&
    request.method === "GET" &&
    (request.headers.get("accept") || "").includes("text/html")
  ) {
    assetUrl.pathname = "/index.html";
    response = await env.ASSETS.fetch(new Request(assetUrl, request));
  }
  return response;
}

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) {
        return await handleApi(request, env, url);
      }
      return await serveAsset(request, env, url);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (status >= 500) {
        console.error("cv2pf request failed", {
          path: url.pathname,
          status,
          detail: error?.detail || String(error),
        });
      }
      return json(
        { error: error instanceof Error ? error.message : "Internal Server Error" },
        status,
      );
    }
  },
};

export default worker;
