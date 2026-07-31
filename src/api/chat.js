import client from "./client.js";

// 첨부 파일이 있으면 multipart(FormData)로, 없으면 기존 JSON으로 보낸다.
// (axios는 FormData를 넘기면 multipart 경계 헤더를 자동으로 설정한다.)
export async function sendChatMessage(prompt, files = []) {
  let data;
  if (files.length > 0) {
    const form = new FormData();
    if (prompt) form.append("prompt", prompt);
    for (const file of files) form.append("files", file);
    ({ data } = await client.post("/chat", form));
  } else {
    ({ data } = await client.post("/chat", { prompt }));
  }

  return {
    status: data.result,
    detections: data.detections ?? [],
    maskedPrompt: data.masked_prompt,
    response: data.content,
    files: data.files ?? [],
  };
}
