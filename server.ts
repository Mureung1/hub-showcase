import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { PRODUCT_CATALOG, findCatalogProduct } from "./src/data/productCatalog";

dotenv.config();

// Ensure AI Client is lazily initialized
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
      try {
        aiClient = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "pick-my-clothes",
            },
          },
        });
        console.log("Gemini API Client initialized successfully.");
      } catch (e) {
        console.error("Failed to initialize Gemini API Client:", e);
      }
    } else {
      console.warn(
        "GEMINI_API_KEY is missing. Create a .env file in the project root and add GEMINI_API_KEY=your_key."
      );
    }
  }
  return aiClient;
}

const app = express();
const PORT = 3000;
const GEMINI_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs = GEMINI_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Gemini 응답 시간이 ${timeoutMs / 1000}초를 초과했습니다.`)),
        timeoutMs
      );
    }),
  ]);
}

app.use(express.json());

// Healthy probe endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Gemini API connection test endpoint
app.get("/api/gemini-test", async (_req, res) => {
  try {
    const ai = getAIClient();

    if (!ai) {
      return res.status(500).json({
        success: false,
        source: "no-api-key",
        message:
          "GEMINI_API_KEY를 읽지 못했습니다. 프로젝트 최상위 .env 파일을 확인하세요.",
      });
    }

    const response = await withTimeout(ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents:
        "당신은 Pick My Clothes의 AI 스타일리스트입니다. 'Gemini API 연결 성공'이라는 문구를 포함해 한국어로 한 문장만 답해주세요.",
    }));

    const responseText = response.text?.trim();

    if (!responseText) {
      throw new Error("Gemini가 빈 응답을 반환했습니다.");
    }

    return res.json({
      success: true,
      source: "gemini-3.1-flash-lite",
      text: responseText,
    });
  } catch (error) {
    console.error("Gemini connection test failed:", error);

    return res.status(500).json({
      success: false,
      source: "gemini-error",
      message:
        error instanceof Error ? error.message : "알 수 없는 Gemini API 오류",
    });
  }
});

// Smart offline recommendation fallback rules
function getOfflineRecommendation(
  weather: string,
  destination: string,
  situation: string,
  closet: any[]
) {
  const tops = closet.filter((item) => item.category === "top");
  const bottoms = closet.filter((item) => item.category === "bottom");
  const shoes = closet.filter((item) => item.category === "shoes");
  const accessories = closet.filter((item) => item.category === "accessories");

  const pickRandom = (items: any[]) =>
    items.length > 0 ? items[Math.floor(Math.random() * items.length)] : null;

  const selectedTop = pickRandom(tops);
  const selectedBottom = pickRandom(bottoms);
  const selectedShoes = pickRandom(shoes);
  const selectedAccessory = pickRandom(accessories);

  const weatherLabel: Record<string, string> = {
    sun: "맑은 날",
    cloud: "흐린 날",
    rain: "비 오는 날",
    snow: "눈 오는 날",
  };

  const destinationLabel: Record<string, string> = {
    cafe: "카페",
    home: "집",
    school: "학교",
    office: "회사",
    party: "모임",
  };

  const situationLabel: Record<string, string> = {
    date: "데이트",
    workout: "운동",
    formal: "격식 있는 일정",
    daily: "일상",
  };

  const selectedItems = [selectedTop, selectedBottom, selectedShoes, selectedAccessory]
    .filter(Boolean)
    .map((item) => item.name)
    .join(", ");

  const stylistNote = `선택한 조건인 ${weatherLabel[weather] ?? weather}, ${destinationLabel[destination] ?? destination}, ${situationLabel[situation] ?? situation}을 고려했습니다.
옷장에 등록된 아이템 중 실제로 입기 편하고 색상 조합이 자연스러운 구성을 우선했습니다.
추천 아이템: ${selectedItems || "선택 가능한 옷이 부족합니다."}
현재 Gemini 연결이 원활하지 않아 기본 추천 방식으로 결과를 제공했습니다.`;

  return {
    topId: selectedTop?.id ?? "",
    bottomId: selectedBottom?.id ?? "",
    shoesId: selectedShoes?.id ?? "",
    accessoriesId: selectedAccessory?.id ?? "",
    stylistNote,
  };
}

type FashionCategory = "top" | "bottom" | "shoes" | "accessories";

function scoreCatalogProduct(item: any, weather: string, destination: string, situation: string): number {
  let score = Math.random() * 0.25;
  if (item.weather?.includes(weather)) score += 3;
  if (item.destinations?.includes(destination)) score += 2;
  if (item.styles?.includes(situation)) score += 3;
  if (situation === "casual" && item.styles?.includes("casual")) score += 2;
  return score;
}

function pickCatalogItem(category: FashionCategory, weather: string, destination: string, situation: string) {
  return PRODUCT_CATALOG
    .filter((item) => item.category === category)
    .sort((a, b) => scoreCatalogProduct(b, weather, destination, situation) - scoreCatalogProduct(a, weather, destination, situation))[0];
}

function buildCatalogOutfit(ids: Record<string, string>, stylistNote: string, source: string) {
  const safePick = (category: FashionCategory, requestedId?: string) => {
    const requested = requestedId ? findCatalogProduct(requestedId) : undefined;
    return requested?.category === category ? requested : PRODUCT_CATALOG.find((item) => item.category === category);
  };

  return {
    isNewOutfit: true,
    top: safePick("top", ids.topId),
    bottom: safePick("bottom", ids.bottomId),
    shoes: safePick("shoes", ids.shoesId),
    accessories: safePick("accessories", ids.accessoriesId),
    stylistNote,
    source,
  };
}

function getOfflineNewOutfitRecommendation(weather: string, destination: string, situation: string) {
  const top = pickCatalogItem("top", weather, destination, situation);
  const bottom = pickCatalogItem("bottom", weather, destination, situation);
  const shoes = pickCatalogItem("shoes", weather, destination, situation);
  const accessories = pickCatalogItem("accessories", weather, destination, situation);

  return buildCatalogOutfit(
    { topId: top.id, bottomId: bottom.id, shoesId: shoes.id, accessoriesId: accessories.id },
    `${weather} 날씨와 ${destination} 장소, ${situation} 상황을 반영해 자체 상품 카탈로그에서 코디를 골랐습니다.\n상의와 하의의 색상 균형을 맞추고, 이동하기 편한 신발을 함께 구성했습니다.\n액세서리는 전체 코디를 방해하지 않으면서 포인트가 되도록 선택했습니다.\nGemini 연결이 어려워도 자체 추천 규칙으로 안정적으로 결과를 제공합니다.`,
    "local-catalog-fallback"
  );
}

// API endpoint for Outfit Coordination Recommendation
app.post("/api/recommend", async (req, res) => {
  try {
    const { weather, destination, situation, closet, mode } = req.body;

    if (!weather || !destination || !situation || !closet || !Array.isArray(closet)) {
      return res.status(400).json({ error: "Missing required selection parameters or closet inventory." });
    }

    const ai = getAIClient();

    // New Outfit mode: Gemini must select IDs from the local catalog only.
    if (mode === "new_outfit") {
      if (!ai) return res.json(getOfflineNewOutfitRecommendation(weather, destination, situation));

      const catalogText = PRODUCT_CATALOG.map((item) =>
        `ID:${item.id} | ${item.category} | ${item.name} | colors:${item.colors.join(",")} | seasons:${item.seasons.join(",")} | styles:${item.styles.join(",")}`
      ).join("\n");

      const promptString = `당신은 대한민국의 전문 패션 스타일리스트입니다.
아래 자체 상품 카탈로그에 존재하는 상품 ID만 사용하여 코디를 추천하세요.
새 상품명이나 존재하지 않는 ID를 절대 만들지 마세요.

조건
- 날씨: ${weather}
- 장소: ${destination}
- 상황: ${situation}

상품 카탈로그
${catalogText}

상의, 하의, 신발, 액세서리 ID를 하나씩 고르세요.
stylistNote는 선택 이유를 자연스러운 한국어 4줄로 설명하세요.`;

      try {
        const response = await withTimeout(ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: promptString,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                topId: { type: Type.STRING }, bottomId: { type: Type.STRING },
                shoesId: { type: Type.STRING }, accessoriesId: { type: Type.STRING },
                stylistNote: { type: Type.STRING }
              },
              required: ["topId", "bottomId", "shoesId", "accessoriesId", "stylistNote"]
            },
            temperature: 0.3
          }
        }));
        const parsed = JSON.parse(response.text?.trim() || "{}");
        return res.json(buildCatalogOutfit(parsed, parsed.stylistNote || "자체 상품 카탈로그에서 조건에 맞는 코디를 선택했습니다.", "gemini-local-catalog"));
      } catch (error) {
        console.error("Gemini catalog recommendation failed:", error);
        return res.json(getOfflineNewOutfitRecommendation(weather, destination, situation));
      }
    }

    // Default My Closet mode
    if (!ai) {
      const fallback = getOfflineRecommendation(weather, destination, situation, closet);
      return res.json({ ...fallback, source: "local-fallback" });
    }

    // Prepare catalog text description for Gemini AI
    const closetDescription = closet.map((item, idx) => {
      return `ID: ${item.id} | Name: ${item.name} | Category: ${item.category} | Colors: ${item.colors.join(", ")}`;
    }).join("\n");

    const promptString = `당신은 대한민국의 전문 패션 스타일리스트입니다.

사용자의 옷장에 등록된 아이템 안에서만 날씨, 장소, 상황에 어울리는 현실적인 코디를 선택하세요.

사용자 조건
- 날씨: ${weather}
- 장소: ${destination}
- 상황: ${situation}

사용자 옷장 목록
${closetDescription}

추천 규칙
1. 날씨를 가장 우선적으로 고려하세요.
2. 장소의 분위기와 이동량, 상황에 필요한 단정함이나 활동성을 함께 고려하세요.
3. 일반인이 실제로 입을 수 있는 자연스러운 데일리룩을 선택하세요.
4. 사용자가 요청하지 않은 사이버펑크, 코스프레, SF, 네온, 홀로그램, 무대 의상 스타일은 선택 기준으로 사용하지 마세요.
5. 제공된 옷장 목록에 존재하는 ID만 반환하세요. 절대로 새로운 ID나 옷을 만들어내지 마세요.
6. 상의 1개, 하의 1개, 신발 1개를 선택하고, 어울리는 액세서리가 있을 때만 1개 선택하세요.
7. 특정 카테고리의 아이템이 없다면 해당 ID는 빈 문자열로 반환하세요.
8. stylistNote는 한국어 4~5줄로 작성하고, 날씨·장소·상황을 각각 어떻게 반영했는지 구체적으로 설명하세요.

응답은 responseSchema에 맞는 JSON 형식으로만 작성하세요.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: promptString,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topId: { type: Type.STRING, description: "ID of the recommended top clothing item from the provided catalog" },
              bottomId: { type: Type.STRING, description: "ID of the recommended bottom clothing item from the provided catalog" },
              shoesId: { type: Type.STRING, description: "ID of the recommended shoes clothing item from the provided catalog" },
              accessoriesId: { type: Type.STRING, description: "ID of the recommended accessory clothing item from the provided catalog (optional)" },
              stylistNote: { type: Type.STRING, description: "Korean explanation of how weather, destination, and situation were reflected" }
            },
            required: ["topId", "bottomId", "shoesId", "stylistNote"]
          },
          temperature: 0.25
        }
      });

      const resultText = response.text;
      if (resultText) {
        const parsedResult = JSON.parse(resultText.trim());
        return res.json({
          ...parsedResult,
          source: "gemini-3.1-flash-lite",
        });
      } else {
        throw new Error("Empty response from Gemini model.");
      }
    } catch (apiError) {
      console.error("Gemini API Error, falling back to local recommendation rules:", apiError);
      const fallback = getOfflineRecommendation(weather, destination, situation, closet);
      return res.json({ ...fallback, source: "local-fallback" });
    }
  } catch (err: any) {
    console.error("Server Recommendation Error:", err);
    res.status(500).json({ error: "Failed to coordinate outfit.", message: err.message });
  }
});

// Setup Vite and Static Asset Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware loaded.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Static production asset directory served.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Pick My Clothes] Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start Pick My Clothes server:", error);
  process.exit(1);
});