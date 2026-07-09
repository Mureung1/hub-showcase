import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
const geminiKey = process.env.GEMINI_API_KEY;

if (geminiKey && geminiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini API client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini API Client:", err);
  }
} else {
  console.log("No valid GEMINI_API_KEY found. Falling back to local smart generation mode.");
}

// REST API for Clothes Style Recommendation
app.post("/api/recommend", async (req, res) => {
  const { items, mood, weather, place, situation } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Invalid items list provided" });
  }

  const itemsDescription = items.map((item: any) => `- [${item.category}] ${item.name} (${item.tag || "no tag"})`).join("\n");
  const selectedMood = mood || "오늘의 특별한 기분";
  const selectedWeather = weather || "맑은 날";
  const selectedPlace = place || "감성 카페";
  const selectedSituation = situation || "일상/산책";

  // Heuristic-based Local Fallback suggestions in Korean if Gemini is unavailable
  const fallbackStyles = [
    `${selectedWeather}에 딱인 날!\n오늘 ${selectedPlace}에서 ${selectedSituation}을(를) 즐기기 위해 ${items.map(i => i.name).join("와(과) ")}를(을) 코디해 보면 어떨까요? 프렌치 시크 느낌이 가득한 스타일로 하루를 특별하고 따뜻하게 보낼 수 있어요. 🎨✨`,
    `${selectedWeather} 분위기에 어울리는 따뜻한 초이스!\n오늘 ${selectedPlace}로 가시는 군요. ${selectedSituation} 상황에 맞춘 ${items.map(i => i.name).join("와(과) ")}의 조합은 편안하면서도 스타일리시한 감성을 더해 줍니다. 나만의 포인트 악세서리를 매치해도 좋을 것 같아요! 🧸🌟`,
    `${selectedWeather}, 감성 가득한 날!\n오늘 ${selectedPlace}에서 ${selectedSituation} 일정을 위해 완성된 ${items.map(i => i.name).join(", ")} 룩은 미니멀하면서도 지적인 느낌을 줍니다. 자신감 넘치게 아름다운 하루를 시작하세요! 💼🕶️`,
    `내추럴하고 따뜻한 감성이 넘치는 오늘!\n${selectedWeather}에 어울리는 포근한 ${items.map(i => i.name).join(" + ")} 코디는 ${selectedPlace}에서 ${selectedSituation}을(를) 보내기에 자연스러운 편안함을 선물합니다. 기분 좋은 하루를 맞이하세요. 🍃☕`
  ];

  const localText = fallbackStyles[Math.floor(Math.random() * fallbackStyles.length)];

  if (!ai) {
    // Return local backup recommendations
    return res.json({
      title: `${selectedSituation} 추천 룩`,
      recommendationText: localText,
      source: "Local Heuristic Engine"
    });
  }

  try {
    const prompt = `You are a friendly, highly professional fashion stylist and scrapbook curator.
Write a cute, warm, and highly engaging style diary recommendation for a digital wardrobe scrapbook app.
The user wants a recommendation for the mood: "${selectedMood}".

We also have specific context about the user's day:
- Weather: ${selectedWeather}
- Place: ${selectedPlace}
- Situation/Occasion: ${selectedSituation}

Here are the selected clothing items for today's look:
${itemsDescription}

Rules for response:
1. Provide a creative, emotional title in Korean (maximum 20 characters) for today's styling story (e.g. "비 오는 날의 따뜻한 라떼", "햇살 가득한 미술관 데이트"). It should blend the weather, place, or situation perfectly.
2. Write a highly personalized, inspiring, and aesthetic description (2-3 sentences) in Korean, explaining why this combination of items is perfect for this specific weather, place, and situation. Explain how they complement each other, and give warm, friendly style tips. Use warm emojis and friendly language (존댓말, 해요체).
3. Do NOT use markdown bold/italic tags like ** or * in the text. Keep it looking like a neat handwritten letter.
4. Return the output STRICTLY as a JSON object with this format:
{
  "title": "the creative title in Korean",
  "recommendationText": "the styling advice description text in Korean"
}
Do not write anything else besides the raw JSON object.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text || "";
    try {
      const parsed = JSON.parse(responseText.trim());
      return res.json({
        title: parsed.title || `${selectedSituation} 추천 룩`,
        recommendationText: parsed.recommendationText || localText,
        source: "Gemini AI"
      });
    } catch (parseError) {
      console.error("JSON parsing error on Gemini response, falling back:", parseError, responseText);
      // Try to clean markdown code blocks if any
      const cleaned = responseText.replace(/```json|```/g, "").trim();
      try {
        const parsedCleaned = JSON.parse(cleaned);
        return res.json({
          title: parsedCleaned.title || `${selectedSituation} 추천 룩`,
          recommendationText: parsedCleaned.recommendationText || localText,
          source: "Gemini AI (Cleaned)"
        });
      } catch {
        return res.json({
          title: `${selectedSituation} 추천 룩`,
          recommendationText: localText,
          source: "Local Heuristic Engine (Parsing Fail)"
        });
      }
    }
  } catch (error) {
    console.error("Gemini recommendation service failed, falling back:", error);
    return res.json({
      title: `${selectedSituation} 추천 룩`,
      recommendationText: localText,
      source: "Local Heuristic Engine (Service Fail)"
    });
  }
});

// Configure Vite or Static Asset Serving
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Production static files server mounted.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

setupViteOrStatic();
