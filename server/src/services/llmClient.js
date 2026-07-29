import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  throw new Error("ANTHROPIC_API_KEY가 .env에 설정되어야 합니다.");
}

const client = new Anthropic({ apiKey });
const MODEL = "claude-sonnet-5";

// system/user 프롬프트로 Claude를 호출하고, output_config.format(JSON 스키마 강제)으로
// 응답이 schema 형태를 벗어나지 않게 만든 뒤 파싱해 반환한다. 프롬프트로만 "JSON만
// 응답하라"고 요청하면 가끔 설명 문구가 섞여 파싱이 깨져서 구조화 출력을 쓴다.
// 짧은 생성형 콘텐츠(홍보글/공지/브리핑 문구) 용도라 thinking은 끄고 속도를 우선한다.
export async function generateJson({ system, user, schema, maxTokens = 1024 }) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: "disabled" },
    system,
    messages: [{ role: "user", content: user }],
    output_config: { format: { type: "json_schema", schema } },
  });

  const text = response.content.find((block) => block.type === "text")?.text ?? "";
  return JSON.parse(text);
}
