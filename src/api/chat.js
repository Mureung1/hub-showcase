import client from "./client.js";

export async function sendChatMessage(prompt) {
  const { data } = await client.post("/chat", { prompt });
  return {
    status: data.result,
    detections: data.detections ?? [],
    maskedPrompt: data.masked_prompt,
    response: data.content,
  };
}
