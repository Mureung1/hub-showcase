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
  };
}

export function createMockPortfolioApi(seed = []) {
  let rows = seed.map((row) => ({ ...row }));

  return {
    async save(input) {
      const portfolio = {
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
  };
}

export const portfolioApi =
  import.meta.env.VITE_USE_MOCK_PORTFOLIOS === "true"
    ? createMockPortfolioApi()
    : createPortfolioApi();
