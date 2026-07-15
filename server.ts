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
  // Categorize closet items
  const tops = closet.filter(item => item.category === 'top');
  const bottoms = closet.filter(item => item.category === 'bottom');
  const shoes = closet.filter(item => item.category === 'shoes');
  const accessories = closet.filter(item => item.category === 'accessories');

  // Fallback to choosing first items if not empty
  const selectedTop = tops[Math.floor(Math.random() * tops.length)] || null;
  const selectedBottom = bottoms[Math.floor(Math.random() * bottoms.length)] || null;
  const selectedShoes = shoes[Math.floor(Math.random() * shoes.length)] || null;
  const selectedAccessory = accessories[Math.floor(Math.random() * accessories.length)] || null;

  // Design beautiful retro style note based on parameters
  let systemStatus = "";
  let environmentLog = "";
  let aestheticRef = "";
  let recommendationResult = "";

  if (weather === 'sun') {
    systemStatus = "Analyzing solar radiation levels... [Clear, 24°C]";
    environmentLog = "UV index moderate. Perfect outdoor luminance detected.";
  } else if (weather === 'cloud') {
    systemStatus = "Analyzing cloud coverage... [Cloudy, 18°C]";
    environmentLog = "Low glare situation. High humidity vapor vibes.";
  } else if (weather === 'rain') {
    systemStatus = "Precipitation warning active... [Rainy, 14°C]";
    environmentLog = "Water droplets detected on outer shields.";
  } else {
    systemStatus = "Sub-zero conditions detected... [Snowing, -2°C]";
    environmentLog = "Frost particles crystalizing in atmosphere.";
  }

  if (destination === 'cafe' || destination === 'home') {
    aestheticRef = "Sourcing low-energy cozy aesthetic presets...";
    recommendationResult = `Today is a perfect day for a relaxed and casual fit. Selected ${selectedTop ? selectedTop.name : "Top"} with ${selectedBottom ? selectedBottom.name : "Bottom"} to maximize comfort while maintaining elite visual coordinates.`;
  } else if (destination === 'school' || destination === 'office') {
    aestheticRef = "Sourcing active workstation & productivity aesthetic...";
    recommendationResult = `Optimal ergonomics achieved. Pairing ${selectedTop ? selectedTop.name : "Top"} with ${selectedBottom ? selectedBottom.name : "Bottom"} delivers a sharp, clean silhouette suitable for technical focus environments.`;
  } else { // party
    aestheticRef = "Sourcing high-luminance neon social aesthetic...";
    recommendationResult = `High-energy social mode activated! The vibrant contrast of ${selectedTop ? selectedTop.name : "Top"} and ${selectedBottom ? selectedBottom.name : "Bottom"} will turn heads in the neon grid.`;
  }

  // Inject some specific situation advice
  if (situation === 'date') {
    recommendationResult += " Highly recommend styling with dynamic hair pins or accessories to elevate cute index.";
  } else if (situation === 'workout') {
    recommendationResult += " Ensuring peak physical mobility with high-flexibility joint alignments.";
  } else if (situation === 'formal') {
    recommendationResult += " Maintaining rigid structure protocols for dignified physical representations.";
  } else {
    recommendationResult += " Maximum freedom mode active. Chill-wave protocol engaged.";
  }

  const stylistNote = `> SYSTEM: ${systemStatus}
> SYSTEM: ${environmentLog}
> SYSTEM: ${aestheticRef}
> RESULT: ${recommendationResult}
> Status: Offline recommendation engine active (Awaiting API connection)`;

  return {
    topId: selectedTop ? selectedTop.id : "",
    bottomId: selectedBottom ? selectedBottom.id : "",
    shoesId: selectedShoes ? selectedShoes.id : "",
    accessoriesId: selectedAccessory ? selectedAccessory.id : "",
    stylistNote
  };
}

// Offline list of exciting new clothes
function getOfflineNewOutfitRecommendation(
  weather: string,
  destination: string,
  situation: string
) {
  const newTops = [
    { name: "네온 사이버 펑크 윈드브레이커", colors: ["Neon Pink", "Black"], imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=400", description: "화려한 네온 핑크 컬러와 반사 재질로 야간에도 빛나는 미래형 윈드브레이커 상의" },
    { name: "홀로그램 테크웨어 아노락", colors: ["Holo Blue", "Silver"], imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400", description: "각도에 따라 색상이 변하는 홀로그램 하이테크 디자인 아노락" },
    { name: "글리치 매트릭스 크롭 티셔츠", colors: ["Black", "Acid Green"], imageUrl: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=400", description: "레트로 매트릭스 컴퓨터 글리치 효과가 멋진 아시드 그린 크롭 탑" }
  ];

  const newBottoms = [
    { name: "다기능 테크웨어 버클 조거팬츠", colors: ["Matt Black"], imageUrl: "https://images.unsplash.com/photo-1517423568366-8b83523034fd?auto=format&fit=crop&q=80&w=400", description: "수많은 주머니와 테크니컬 스트랩, 버클로 디테일을 극대화한 블랙 조거팬츠" },
    { name: "네온 파이핑 글리치 스커트", colors: ["Cyber Purple", "Neon Pink"], imageUrl: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&q=80&w=400", description: "네온 컬러 라인이 밤마다 빛나는 사이버펑크 감성의 비대칭 스커트" },
    { name: "디지털 스카이 데님 쇼츠", colors: ["Cyan Acid Wash"], imageUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=400", description: "구름 낀 하늘을 닮은 독창적인 워싱 디테일의 청량한 데님 쇼츠" }
  ];

  const newShoes = [
    { name: "사이버네틱 나이트 에어 슈즈", colors: ["Neon Violet", "White"], imageUrl: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=400", description: "충격 흡수 에어 쿠션과 LED 라이팅이 내장되어 피로감을 줄여주는 미래지향적 슈즈" },
    { name: "하이테크 레이저 러너 3.0", colors: ["Electric Green", "Black"], imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400", description: "가벼운 피팅감과 날렵한 사이버 라인으로 속도감을 극대화한 에어로 슈즈" }
  ];

  const newAccessories = [
    { name: "스마트 네온 바이저 고글", colors: ["Electric Yellow", "Black"], imageUrl: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=400", description: "증강 현실 안경을 닮은 미래지향적 선글라스 바이저 고글" },
    { name: "8비트 픽셀 하트 목걸이", colors: ["Magenta Pink"], imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=400", description: "레트로 8비트 게임의 하트 아이콘을 그대로 재현한 귀여운 목걸이 소품" }
  ];

  const top = newTops[Math.floor(Math.random() * newTops.length)];
  const bottom = newBottoms[Math.floor(Math.random() * newBottoms.length)];
  const shoes = newShoes[Math.floor(Math.random() * newShoes.length)];
  const accessory = newAccessories[Math.floor(Math.random() * newAccessories.length)];

  const stylistNote = `> SYSTEM: 가상 의류 그리드에 접속하여 새로운 제품을 스캔 중...
> SYSTEM: 트렌드 분석: weather=${weather}, location=${destination} 분위기 최적 매칭 완료
> RESULT: 회원님의 옷장에는 아직 없지만, 오늘의 컨셉에 120% 일치하는 환상적인 아이템들을 준비했어요!
> 추천 아이템: ${top.name}, ${bottom.name} 조합으로 유니크한 스트릿 무드를 연출해보세요!
> Status: Offline recommendation engine active`;

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
      shoppingUrl: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(item.name)}`
    };
  };

  return {
    isNewOutfit: true,
    top: formatWithShopping(top, "top", 1),
    bottom: formatWithShopping(bottom, "bottom", 2),
    shoes: formatWithShopping(shoes, "shoes", 3),
    accessories: formatWithShopping(accessory, "accessories", 4),
    stylistNote
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

      const promptString = `You are a professional cyberpunk and cute pixel-art virtual stylist. Your task is to recommend a highly coordinated outfit of BRAND NEW clothes (not in the user's catalog) that fits the selected criteria:
- Weather: ${weather}
- Destination: ${destination}
- Situation: ${situation}

Since these are new clothes, you must design them! Generate exactly one new TOP, one new BOTTOM, one new SHOES, and optionally one new ACCESSORY.
Return your response strictly in JSON format as defined by the responseSchema.

For each item, specify:
- name: A cool, stylish name in Korean (e.g., '홀로그램 스페이스 아노락', '네온 스트랩 카고 조거팬츠')
- colors: An array of 1 or 2 matching color names in English (e.g., ['Neon Blue', 'Silver'])
- description: A short description in Korean of why this item is perfect (e.g., '빛을 반사하는 홀로그램 재질로 미래지향적 감각을 연출합니다.')
- shoppingKeyword: A short shopping keyword in Korean for searching this item on shopping malls (e.g., '홀로그램 바람막이')
- imageIndex: An integer representing which aesthetic image fits best (from 0 to 4 for top/bottom, 0 to 3 for shoes/accessories).

For 'stylistNote': Provide a cute retro 8-bit style note in Korean explaining your aesthetic choices, style guidelines, and why this is a good fit. Format the note like a retro cyber terminal output with console tags like:
> SYSTEM: Sourcing new fashion grid...
> SYSTEM: Target coordinates matched!
> RESULT: [Korean description...]
> Awaiting user purchase
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
            temperature: 0.85
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

    const promptString = `You are a professional cyberpunk and cute pixel-art virtual stylist. Your task is to recommend a highly coordinated outfit consisting of a TOP, a BOTTOM, a SHOES, and optionally an ACCESSORY from the user's clothing catalog based on the selected criteria:
- Weather: ${weather}
- Destination: ${destination}
- Situation: ${situation}

Here is the user's clothing catalog:
${closetDescription}

Please pick exactly one top, one bottom, one shoes, and optionally one accessory from the list. If the list is missing items in a specific category, pick the closest matching item or leave empty if nothing is found.
Return your response strictly in JSON format as defined by the schema.

For 'stylistNote': Provide a cute pixel-stylist note in Korean explaining your aesthetic choices, style guidelines, and why this is a good fit. Format the note like a retro cyber terminal output with console tags like:
> SYSTEM: Analyzing weather...
> SYSTEM: Cross-referencing vaporwave mood...
> RESULT: [Korean description...]
> Awaiting user input

Keep the stylistNote around 4-5 lines.`;

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
              stylistNote: { type: Type.STRING, description: "Cute retro 8-bit style note in Korean with console tags" }
            },
            required: ["topId", "bottomId", "shoesId", "stylistNote"]
          },
          temperature: 0.8
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