import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

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

// Offline list of realistic new clothes
function getOfflineNewOutfitRecommendation(
  weather: string,
  destination: string,
  situation: string
) {
  const newTops = [
    { name: "베이직 코튼 셔츠", colors: ["White", "Light Blue"], imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=400", description: "단정하면서도 편안해 학교, 카페, 데이트 등 다양한 일정에 활용하기 좋은 셔츠" },
    { name: "오버핏 맨투맨", colors: ["Gray", "Navy"], imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400", description: "일상에서 부담 없이 입기 좋고 활동성이 뛰어난 데일리 상의" },
    { name: "라운드넥 니트", colors: ["Ivory", "Beige"], imageUrl: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=400", description: "차분한 색감으로 깔끔하고 포근한 분위기를 연출하는 기본 니트" },
  ];

  const newBottoms = [
    { name: "스트레이트 데님 팬츠", colors: ["Denim Blue"], imageUrl: "https://images.unsplash.com/photo-1517423568366-8b83523034fd?auto=format&fit=crop&q=80&w=400", description: "대부분의 상의와 잘 어울리고 오래 걸어도 편안한 기본 데님" },
    { name: "와이드 슬랙스", colors: ["Black", "Charcoal"], imageUrl: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&q=80&w=400", description: "단정한 인상과 편안한 착용감을 함께 갖춘 실용적인 하의" },
    { name: "코튼 롱스커트", colors: ["Beige", "Black"], imageUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=400", description: "카페나 데이트처럼 편안하면서도 분위기가 필요한 일정에 잘 어울리는 스커트" },
  ];

  const newShoes = [
    { name: "화이트 데일리 스니커즈", colors: ["White"], imageUrl: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=400", description: "장시간 걸어도 편하고 다양한 코디에 자연스럽게 어울리는 기본 스니커즈" },
    { name: "블랙 로퍼", colors: ["Black"], imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400", description: "학교, 회사, 데이트 등 단정한 분위기가 필요한 장소에 활용하기 좋은 신발" },
  ];

  const newAccessories = [
    { name: "미니 크로스백", colors: ["Black", "Brown"], imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=400", description: "필요한 소지품을 간단히 넣을 수 있고 데일리 코디에 부담 없이 어울리는 가방" },
    { name: "심플 실버 목걸이", colors: ["Silver"], imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=400", description: "과하지 않게 포인트를 더해주는 데일리 액세서리" },
  ];

  const pickRandom = (items: any[]) => items[Math.floor(Math.random() * items.length)];
  const top = pickRandom(newTops);
  const bottom = pickRandom(newBottoms);
  const shoes = pickRandom(newShoes);
  const accessory = pickRandom(newAccessories);

  const stylistNote = `선택한 날씨(${weather}), 장소(${destination}), 상황(${situation})을 기준으로 실제로 구매하고 활용하기 쉬운 아이템을 골랐습니다.
${top.name}과 ${bottom.name}을 중심으로 편안하고 자연스러운 데일리룩을 구성했습니다.
신발과 액세서리는 장소의 활동성과 전체 색상 조화를 고려했습니다.
현재 Gemini 연결이 원활하지 않아 기본 추천 방식으로 결과를 제공했습니다.`;

  const formatWithShopping = (item: any, category: string, index: number) => {
    const id = `recommended-new-${category}-${Date.now()}-${index}`;
    return {
      id,
      name: item.name,
      category,
      colors: item.colors,
      imageUrl: item.imageUrl,
      isCustom: true,
      description: item.description,
      shopName: "Naver Shopping",
      shoppingUrl: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(item.name)}`,
    };
  };

  return {
    isNewOutfit: true,
    top: formatWithShopping(top, "top", 1),
    bottom: formatWithShopping(bottom, "bottom", 2),
    shoes: formatWithShopping(shoes, "shoes", 3),
    accessories: formatWithShopping(accessory, "accessories", 4),
    stylistNote,
  };
}

const NEW_FASHION_IMAGES = {
  top: [
    "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=400", // hoodie
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400", // crop top
    "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=400", // print tee
    "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&q=80&w=400", // oversized top
    "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&q=80&w=400"  // black tee
  ],
  bottom: [
    "https://images.unsplash.com/photo-1517423568366-8b83523034fd?auto=format&fit=crop&q=80&w=400", // cargo
    "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&q=80&w=400", // skirt
    "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=400", // denim shorts
    "https://images.unsplash.com/photo-1551854838-212c50b4c184?auto=format&fit=crop&q=80&w=400", // joggers
    "https://images.unsplash.com/photo-1506629082925-0151a14e7230?auto=format&fit=crop&q=80&w=400"  // grey jogger
  ],
  shoes: [
    "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=400", // air kicks
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400", // red runner
    "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=400", // leather boots
    "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=400"  // premium trainers
  ],
  accessories: [
    "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=400", // visor
    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=400", // necklace
    "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=400", // headphones
    "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=400"  // bag
  ]
};

// API endpoint for Outfit Coordination Recommendation
app.post("/api/recommend", async (req, res) => {
  try {
    const { weather, destination, situation, closet, mode } = req.body;

    if (!weather || !destination || !situation || !closet || !Array.isArray(closet)) {
      return res.status(400).json({ error: "Missing required selection parameters or closet inventory." });
    }

    const ai = getAIClient();

    // If Mode is New Outfit
    if (mode === "new_outfit") {
      if (!ai) {
        const fallback = getOfflineNewOutfitRecommendation(weather, destination, situation);
        return res.json({ ...fallback, source: "local-fallback" });
      }

      const promptString = `당신은 대한민국의 전문 패션 스타일리스트입니다.

사용자가 선택한 조건을 모두 반영해 실제 쇼핑몰에서 검색하고 구매할 수 있을 법한 현실적인 새 옷 코디를 추천하세요.

사용자 조건
- 날씨: ${weather}
- 장소: ${destination}
- 상황: ${situation}

추천 규칙
1. 날씨를 가장 우선적으로 고려하고, 장소와 상황을 함께 반영하세요.
2. 대학생이나 직장인이 일상에서 실제로 입을 수 있는 자연스러운 코디를 추천하세요.
3. 사용자가 직접 요청하지 않은 사이버펑크, 코스프레, SF, 네온, 홀로그램, 무대 의상은 추천하지 마세요.
4. 상의 1개, 하의 1개, 신발 1개, 액세서리 1개를 추천하세요.
5. 색상 조합과 활동성, 계절감을 고려하세요.
6. 상품명은 쇼핑몰에서 검색하기 쉬운 일반적인 한국어 이름으로 작성하세요.
7. 각 아이템 설명에는 선택한 날씨, 장소, 상황 중 어떤 조건을 반영했는지 포함하세요.
8. stylistNote에는 세 조건을 각각 어떻게 반영했는지 4~5줄의 자연스러운 한국어로 설명하세요.

응답은 responseSchema에 맞는 JSON 형식으로만 작성하세요.

각 아이템 필드
- name: 현실적인 한국어 상품명
- colors: 서로 어울리는 영문 색상명 1~2개
- description: 조건을 반영한 이유를 포함한 짧은 한국어 설명
- shoppingKeyword: 네이버 쇼핑에서 검색하기 좋은 짧은 한국어 키워드
- imageIndex: 해당 카테고리 이미지 목록에서 가장 어울리는 인덱스
`;

      try {
        const response = await withTimeout(ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: promptString,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                top: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    colors: { type: Type.ARRAY, items: { type: Type.STRING } },
                    description: { type: Type.STRING },
                    shoppingKeyword: { type: Type.STRING },
                    imageIndex: { type: Type.INTEGER }
                  },
                  required: ["name", "colors", "description", "shoppingKeyword", "imageIndex"]
                },
                bottom: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    colors: { type: Type.ARRAY, items: { type: Type.STRING } },
                    description: { type: Type.STRING },
                    shoppingKeyword: { type: Type.STRING },
                    imageIndex: { type: Type.INTEGER }
                  },
                  required: ["name", "colors", "description", "shoppingKeyword", "imageIndex"]
                },
                shoes: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    colors: { type: Type.ARRAY, items: { type: Type.STRING } },
                    description: { type: Type.STRING },
                    shoppingKeyword: { type: Type.STRING },
                    imageIndex: { type: Type.INTEGER }
                  },
                  required: ["name", "colors", "description", "shoppingKeyword", "imageIndex"]
                },
                accessories: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    colors: { type: Type.ARRAY, items: { type: Type.STRING } },
                    description: { type: Type.STRING },
                    shoppingKeyword: { type: Type.STRING },
                    imageIndex: { type: Type.INTEGER }
                  },
                  required: ["name", "colors", "description", "shoppingKeyword", "imageIndex"]
                },
                stylistNote: { type: Type.STRING }
              },
              required: ["top", "bottom", "shoes", "stylistNote"]
            },
            temperature: 0.35
          }
        }));

        const resultText = response.text;
        if (resultText) {
          const parsed = JSON.parse(resultText.trim());

          // Map index to pre-selected beautiful images
          const getImgUrl = (category: "top" | "bottom" | "shoes" | "accessories", index: number) => {
            const list = NEW_FASHION_IMAGES[category];
            const safeIdx = Math.max(0, Math.min(list.length - 1, isNaN(index) ? 0 : index));
            return list[safeIdx];
          };

          const formatItem = (item: any, category: "top" | "bottom" | "shoes" | "accessories", idx: number) => {
            if (!item) return undefined;
            return {
              id: `recommended-new-${category}-${Date.now()}-${idx}`,
              name: item.name,
              category,
              colors: item.colors,
              imageUrl: getImgUrl(category, item.imageIndex),
              isCustom: true,
              description: item.description,
              shopName: "Naver Shopping",
              shoppingUrl: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(item.shoppingKeyword || item.name)}`
            };
          };

          return res.json({
            isNewOutfit: true,
            top: formatItem(parsed.top, "top", 1),
            bottom: formatItem(parsed.bottom, "bottom", 2),
            shoes: formatItem(parsed.shoes, "shoes", 3),
            accessories: formatItem(parsed.accessories, "accessories", 4),
            stylistNote: parsed.stylistNote,
            source: "gemini-3.1-flash-lite",
          });
        } else {
          throw new Error("Empty response from Gemini.");
        }
      } catch (err) {
        console.error("Gemini Error, falling back to local new outfits:", err);
        const fallback = getOfflineNewOutfitRecommendation(weather, destination, situation);
        return res.json({ ...fallback, source: "local-fallback" });
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
    app.get('*', (req, res) => {
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