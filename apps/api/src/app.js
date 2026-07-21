import cors from "cors";
import "dotenv/config";
import express from "express";

const app = express();
const allowedOrigins = (process.env.WEB_ORIGINS ?? "http://127.0.0.1:5173,http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("허용되지 않은 출처입니다."));
  },
  methods: ["GET"],
}));
app.use(express.json({ limit: "64kb" }));

app.get("/health", (_request, response) => {
  response.json({ ok: true, service: "photo-navigation-api" });
});

app.get("/api/places/search", async (request, response) => {
  const query = String(request.query.q ?? "").trim();
  if (query.length < 2 || query.length > 100) {
    return response.status(400).json({ message: "검색어는 2~100자로 입력해 주세요." });
  }

  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return response.status(503).json({
      message: "장소 검색 API가 아직 설정되지 않았습니다.",
      code: "NAVER_SEARCH_NOT_CONFIGURED",
    });
  }

  try {
    const naverResponse = await fetch(
      `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5`,
      {
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
      },
    );

    if (!naverResponse.ok) {
      return response.status(502).json({ message: "네이버 장소 정보를 불러오지 못했어요." });
    }

    const data = await naverResponse.json();
    const removeHtml = (value = "") => value.replace(/<[^>]*>/g, "");
    return response.json({
      items: data.items.map((item) => ({
        name: removeHtml(item.title),
        category: item.category,
        description: removeHtml(item.description),
        address: item.roadAddress || item.address,
        link: item.link,
      })),
    });
  } catch {
    return response.status(502).json({ message: "장소 검색 서비스에 연결하지 못했어요." });
  }
});

export default app;
