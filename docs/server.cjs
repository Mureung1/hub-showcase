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
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var aiClient = null;
function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
      try {
        aiClient = new import_genai.GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build"
            }
          }
        });
        console.log("Gemini API Client initialized successfully.");
      } catch (e) {
        console.error("Failed to initialize Gemini API Client:", e);
      }
    }
  }
  return aiClient;
}
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
});
function getOfflineRecommendation(weather, destination, situation, closet) {
  const tops = closet.filter((item) => item.category === "top");
  const bottoms = closet.filter((item) => item.category === "bottom");
  const shoes = closet.filter((item) => item.category === "shoes");
  const accessories = closet.filter((item) => item.category === "accessories");
  const selectedTop = tops[Math.floor(Math.random() * tops.length)] || null;
  const selectedBottom = bottoms[Math.floor(Math.random() * bottoms.length)] || null;
  const selectedShoes = shoes[Math.floor(Math.random() * shoes.length)] || null;
  const selectedAccessory = accessories[Math.floor(Math.random() * accessories.length)] || null;
  let systemStatus = "";
  let environmentLog = "";
  let aestheticRef = "";
  let recommendationResult = "";
  if (weather === "sun") {
    systemStatus = "Analyzing solar radiation levels... [Clear, 24\xB0C]";
    environmentLog = "UV index moderate. Perfect outdoor luminance detected.";
  } else if (weather === "cloud") {
    systemStatus = "Analyzing cloud coverage... [Cloudy, 18\xB0C]";
    environmentLog = "Low glare situation. High humidity vapor vibes.";
  } else if (weather === "rain") {
    systemStatus = "Precipitation warning active... [Rainy, 14\xB0C]";
    environmentLog = "Water droplets detected on outer shields.";
  } else {
    systemStatus = "Sub-zero conditions detected... [Snowing, -2\xB0C]";
    environmentLog = "Frost particles crystalizing in atmosphere.";
  }
  if (destination === "cafe" || destination === "home") {
    aestheticRef = "Sourcing low-energy cozy aesthetic presets...";
    recommendationResult = `Today is a perfect day for a relaxed and casual fit. Selected ${selectedTop ? selectedTop.name : "Top"} with ${selectedBottom ? selectedBottom.name : "Bottom"} to maximize comfort while maintaining elite visual coordinates.`;
  } else if (destination === "school" || destination === "office") {
    aestheticRef = "Sourcing active workstation & productivity aesthetic...";
    recommendationResult = `Optimal ergonomics achieved. Pairing ${selectedTop ? selectedTop.name : "Top"} with ${selectedBottom ? selectedBottom.name : "Bottom"} delivers a sharp, clean silhouette suitable for technical focus environments.`;
  } else {
    aestheticRef = "Sourcing high-luminance neon social aesthetic...";
    recommendationResult = `High-energy social mode activated! The vibrant contrast of ${selectedTop ? selectedTop.name : "Top"} and ${selectedBottom ? selectedBottom.name : "Bottom"} will turn heads in the neon grid.`;
  }
  if (situation === "date") {
    recommendationResult += " Highly recommend styling with dynamic hair pins or accessories to elevate cute index.";
  } else if (situation === "workout") {
    recommendationResult += " Ensuring peak physical mobility with high-flexibility joint alignments.";
  } else if (situation === "formal") {
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
app.post("/api/recommend", async (req, res) => {
  try {
    const { weather, destination, situation, closet } = req.body;
    if (!weather || !destination || !situation || !closet || !Array.isArray(closet)) {
      return res.status(400).json({ error: "Missing required selection parameters or closet inventory." });
    }
    const ai = getAIClient();
    if (!ai) {
      const fallback = getOfflineRecommendation(weather, destination, situation, closet);
      return res.json(fallback);
    }
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
        model: "gemini-3.5-flash",
        contents: promptString,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              topId: { type: import_genai.Type.STRING, description: "ID of the recommended top clothing item from the provided catalog" },
              bottomId: { type: import_genai.Type.STRING, description: "ID of the recommended bottom clothing item from the provided catalog" },
              shoesId: { type: import_genai.Type.STRING, description: "ID of the recommended shoes clothing item from the provided catalog" },
              accessoriesId: { type: import_genai.Type.STRING, description: "ID of the recommended accessory clothing item from the provided catalog (optional)" },
              stylistNote: { type: import_genai.Type.STRING, description: "Cute retro 8-bit style note in Korean with console tags" }
            },
            required: ["topId", "bottomId", "shoesId", "stylistNote"]
          },
          temperature: 0.8
        }
      });
      const resultText = response.text;
      if (resultText) {
        const parsedResult = JSON.parse(resultText.trim());
        return res.json(parsedResult);
      } else {
        throw new Error("Empty response from Gemini model.");
      }
    } catch (apiError) {
      console.error("Gemini API Error, falling back to local recommendation rules:", apiError);
      const fallback = getOfflineRecommendation(weather, destination, situation, closet);
      return res.json(fallback);
    }
  } catch (err) {
    console.error("Server Recommendation Error:", err);
    res.status(500).json({ error: "Failed to coordinate outfit.", message: err.message });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware loaded.");
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
    console.log("Static production asset directory served.");
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Pick My Clothes] Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
