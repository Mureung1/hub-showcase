export function parseModelList(value) {
  const models = String(value ?? "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return [...new Set(models)];
}

export function createRequestBody(model, fixture) {
  return {
    model,
    messages: [
      { role: "system", content: fixture.systemPrompt },
      { role: "user", content: fixture.userPrompt },
    ],
    temperature: fixture.temperature ?? 0,
    response_format: { type: "json_object" },
  };
}

export function parseJsonContent(body) {
  const content = body?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    return null;
  }

  try {
    return JSON.parse(removeJsonFence(content));
  } catch {
    return null;
  }
}

export function createResultFileName(model, run) {
  const safeModel = model.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${safeModel}-run-${String(run).padStart(2, "0")}.json`;
}

function removeJsonFence(value) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:```|~~~)(?:json)?\s*([\s\S]*?)\s*(?:```|~~~)$/i);
  return match?.[1]?.trim() ?? trimmed;
}
