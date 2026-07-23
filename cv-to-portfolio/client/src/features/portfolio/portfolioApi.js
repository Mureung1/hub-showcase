async function parseResponse(response) {
  let data = {};
  try {
    data = await response.json();
  } catch {
    // HTML 오류 페이지 등 JSON이 아닌 응답은 공통 메시지로 처리한다.
  }

  if (!response.ok) {
    throw new Error(data.error || `요청에 실패했습니다. (${response.status})`);
  }
  return data;
}

export function createPortfolioApi({
  baseUrl = "/api",
  fetchImpl = globalThis.fetch,
} = {}) {
  return {
    async save(input) {
      const response = await fetchImpl(`${baseUrl}/portfolios`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      return (await parseResponse(response)).portfolio;
    },

    async list(limit = 10) {
      const response = await fetchImpl(`${baseUrl}/portfolios?limit=${limit}`);
      return (await parseResponse(response)).portfolios;
    },

    async get(id) {
      const response = await fetchImpl(`${baseUrl}/portfolios/${encodeURIComponent(id)}`);
      return (await parseResponse(response)).portfolio;
    },

    async updateFavorite(id, isFavorite) {
      const response = await fetchImpl(
        `${baseUrl}/portfolios/${encodeURIComponent(id)}/favorite`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ isFavorite }),
        },
      );
      return (await parseResponse(response)).portfolio;
    },
  };
}

export function createMockPortfolioApi(seed = []) {
  let rows = seed.map((row) => ({
    ...row,
    isFavorite: Boolean(row.isFavorite),
  }));

  return {
    async save(input) {
      const portfolio = {
        isFavorite: false,
        ...input,
        id: globalThis.crypto?.randomUUID?.() || `mock-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      rows = [portfolio, ...rows];
      return { ...portfolio };
    },

    async list(limit = 10) {
      return rows.slice(0, limit).map((row) => {
        const meta = { ...row };
        delete meta.html;
        return meta;
      });
    },

    async get(id) {
      const portfolio = rows.find((row) => row.id === id);
      if (!portfolio) throw new Error("저장된 포트폴리오를 찾을 수 없습니다.");
      return { ...portfolio };
    },

    async updateFavorite(id, isFavorite) {
      const index = rows.findIndex((row) => row.id === id);
      if (index < 0) throw new Error("저장된 포트폴리오를 찾을 수 없습니다.");
      rows[index] = { ...rows[index], isFavorite };
      return { ...rows[index] };
    },
  };
}

const MOCK_PORTFOLIOS = [
  {
    id: "mock-kim-jiwoo",
    name: "김지우",
    title: "Frontend Engineer",
    themeSlug: "minimal-clean",
    themeName: "Minimal Clean",
    html: '<!doctype html><html lang="ko"><body><h1>김지우</h1><p>Frontend Engineer</p></body></html>',
    createdAt: "2026-07-15T00:30:00.000Z",
  },
  {
    id: "mock-lee-seoyeon",
    name: "이서연",
    title: "Product Designer",
    themeSlug: "creative-gradient",
    themeName: "Creative Gradient",
    html: '<!doctype html><html lang="ko"><body><h1>이서연</h1><p>Product Designer</p></body></html>',
    createdAt: "2026-07-14T08:20:00.000Z",
  },
];

export const portfolioApi =
  import.meta.env.VITE_USE_MOCK_PORTFOLIOS === "true"
    ? createMockPortfolioApi(MOCK_PORTFOLIOS)
    : createPortfolioApi();
