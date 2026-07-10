var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
var import_vite = require("vite");
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var ai = null;
var geminiKey = process.env.GEMINI_API_KEY;
if (geminiKey && geminiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new import_genai.GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
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
app.post("/api/recommend", async (req, res) => {
  const { items, mood, weather, place, situation } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Invalid items list provided" });
  }
  const itemsDescription = items.map((item) => `- [${item.category}] ${item.name} (${item.tag || "no tag"})`).join("\n");
  const selectedMood = mood || "\uC624\uB298\uC758 \uD2B9\uBCC4\uD55C \uAE30\uBD84";
  const selectedWeather = weather || "\uB9D1\uC740 \uB0A0";
  const selectedPlace = place || "\uAC10\uC131 \uCE74\uD398";
  const selectedSituation = situation || "\uC77C\uC0C1/\uC0B0\uCC45";
  const fallbackStyles = [
    `${selectedWeather}\uC5D0 \uB531\uC778 \uB0A0!
\uC624\uB298 ${selectedPlace}\uC5D0\uC11C ${selectedSituation}\uC744(\uB97C) \uC990\uAE30\uAE30 \uC704\uD574 ${items.map((i) => i.name).join("\uC640(\uACFC) ")}\uB97C(\uC744) \uCF54\uB514\uD574 \uBCF4\uBA74 \uC5B4\uB5A8\uAE4C\uC694? \uD504\uB80C\uCE58 \uC2DC\uD06C \uB290\uB08C\uC774 \uAC00\uB4DD\uD55C \uC2A4\uD0C0\uC77C\uB85C \uD558\uB8E8\uB97C \uD2B9\uBCC4\uD558\uACE0 \uB530\uB73B\uD558\uAC8C \uBCF4\uB0BC \uC218 \uC788\uC5B4\uC694. \u{1F3A8}\u2728`,
    `${selectedWeather} \uBD84\uC704\uAE30\uC5D0 \uC5B4\uC6B8\uB9AC\uB294 \uB530\uB73B\uD55C \uCD08\uC774\uC2A4!
\uC624\uB298 ${selectedPlace}\uB85C \uAC00\uC2DC\uB294 \uAD70\uC694. ${selectedSituation} \uC0C1\uD669\uC5D0 \uB9DE\uCD98 ${items.map((i) => i.name).join("\uC640(\uACFC) ")}\uC758 \uC870\uD569\uC740 \uD3B8\uC548\uD558\uBA74\uC11C\uB3C4 \uC2A4\uD0C0\uC77C\uB9AC\uC2DC\uD55C \uAC10\uC131\uC744 \uB354\uD574 \uC90D\uB2C8\uB2E4. \uB098\uB9CC\uC758 \uD3EC\uC778\uD2B8 \uC545\uC138\uC11C\uB9AC\uB97C \uB9E4\uCE58\uD574\uB3C4 \uC88B\uC744 \uAC83 \uAC19\uC544\uC694! \u{1F9F8}\u{1F31F}`,
    `${selectedWeather}, \uAC10\uC131 \uAC00\uB4DD\uD55C \uB0A0!
\uC624\uB298 ${selectedPlace}\uC5D0\uC11C ${selectedSituation} \uC77C\uC815\uC744 \uC704\uD574 \uC644\uC131\uB41C ${items.map((i) => i.name).join(", ")} \uB8E9\uC740 \uBBF8\uB2C8\uBA40\uD558\uBA74\uC11C\uB3C4 \uC9C0\uC801\uC778 \uB290\uB08C\uC744 \uC90D\uB2C8\uB2E4. \uC790\uC2E0\uAC10 \uB118\uCE58\uAC8C \uC544\uB984\uB2E4\uC6B4 \uD558\uB8E8\uB97C \uC2DC\uC791\uD558\uC138\uC694! \u{1F4BC}\u{1F576}\uFE0F`,
    `\uB0B4\uCD94\uB7F4\uD558\uACE0 \uB530\uB73B\uD55C \uAC10\uC131\uC774 \uB118\uCE58\uB294 \uC624\uB298!
${selectedWeather}\uC5D0 \uC5B4\uC6B8\uB9AC\uB294 \uD3EC\uADFC\uD55C ${items.map((i) => i.name).join(" + ")} \uCF54\uB514\uB294 ${selectedPlace}\uC5D0\uC11C ${selectedSituation}\uC744(\uB97C) \uBCF4\uB0B4\uAE30\uC5D0 \uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uD3B8\uC548\uD568\uC744 \uC120\uBB3C\uD569\uB2C8\uB2E4. \uAE30\uBD84 \uC88B\uC740 \uD558\uB8E8\uB97C \uB9DE\uC774\uD558\uC138\uC694. \u{1F343}\u2615`
  ];
  const localText = fallbackStyles[Math.floor(Math.random() * fallbackStyles.length)];
  if (!ai) {
    return res.json({
      title: `${selectedSituation} \uCD94\uCC9C \uB8E9`,
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
1. Provide a creative, emotional title in Korean (maximum 20 characters) for today's styling story (e.g. "\uBE44 \uC624\uB294 \uB0A0\uC758 \uB530\uB73B\uD55C \uB77C\uB5BC", "\uD587\uC0B4 \uAC00\uB4DD\uD55C \uBBF8\uC220\uAD00 \uB370\uC774\uD2B8"). It should blend the weather, place, or situation perfectly.
2. Write a highly personalized, inspiring, and aesthetic description (2-3 sentences) in Korean, explaining why this combination of items is perfect for this specific weather, place, and situation. Explain how they complement each other, and give warm, friendly style tips. Use warm emojis and friendly language (\uC874\uB313\uB9D0, \uD574\uC694\uCCB4).
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
        title: parsed.title || `${selectedSituation} \uCD94\uCC9C \uB8E9`,
        recommendationText: parsed.recommendationText || localText,
        source: "Gemini AI"
      });
    } catch (parseError) {
      console.error("JSON parsing error on Gemini response, falling back:", parseError, responseText);
      const cleaned = responseText.replace(/```json|```/g, "").trim();
      try {
        const parsedCleaned = JSON.parse(cleaned);
        return res.json({
          title: parsedCleaned.title || `${selectedSituation} \uCD94\uCC9C \uB8E9`,
          recommendationText: parsedCleaned.recommendationText || localText,
          source: "Gemini AI (Cleaned)"
        });
      } catch {
        return res.json({
          title: `${selectedSituation} \uCD94\uCC9C \uB8E9`,
          recommendationText: localText,
          source: "Local Heuristic Engine (Parsing Fail)"
        });
      }
    }
  } catch (error) {
    console.error("Gemini recommendation service failed, falling back:", error);
    return res.json({
      title: `${selectedSituation} \uCD94\uCC9C \uB8E9`,
      recommendationText: localText,
      source: "Local Heuristic Engine (Service Fail)"
    });
  }
});
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware mounted.");
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
    console.log("Production static files server mounted.");
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}
setupViteOrStatic();
//# sourceMappingURL=server.cjs.map
