import client from "./client.js";

export async function sendChatMessage(prompt) {
  const { data } = await client.post("/chat", { prompt });
  return {
    status: data.result,
    detections: [],
    response: data.content,
  };
}
