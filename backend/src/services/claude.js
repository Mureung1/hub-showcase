import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5";

const REASON_SCHEMA = {
  type: "object",
  properties: {
    reasons: {
      type: "array",
      items: {
        type: "object",
        properties: {
          postingId: { type: "integer" },
          reason: { type: "string" },
        },
        required: ["postingId", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["reasons"],
  additionalProperties: false,
};

function templateReason(posting) {
  return `${posting.field ?? posting.category} 분야에서 회원님의 전공·경험과 관련성이 높아 추천드립니다.`;
}

function buildPrompt(profile, rankedPostings) {
  const profileSummary = [
    `전공: ${profile.major}`,
    profile.doubleMajor && `복수전공: ${profile.doubleMajor}`,
    profile.minor && `부전공: ${profile.minor}`,
    profile.certificates?.length && `자격증: ${profile.certificates.join(", ")}`,
    profile.experience && `경험: ${profile.experience}`,
  ]
    .filter(Boolean)
    .join("\n");

  const postingsSummary = rankedPostings
    .map(
      (posting) =>
        `- id ${posting.id}: ${posting.org} "${posting.title}" (분야: ${posting.field}, 카테고리: ${posting.category})`,
    )
    .join("\n");

  return `아래는 한 대학생의 프로필과, 그 학생에게 추천된 공고 목록이다.

[학생 프로필]
${profileSummary}

[추천된 공고]
${postingsSummary}

각 공고마다 이 학생에게 왜 이 공고가 추천되었는지 1~2문장으로 설명하는 추천 이유를 한국어로 작성해줘. 학생의 전공/자격증/경험과 공고의 분야를 자연스럽게 연결해서 설명해.`;
}

export async function generateReasons(profile, rankedPostings) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not set");
    }

    const client = new Anthropic();

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: Math.max(1024, rankedPostings.length * 250),
      output_config: { format: { type: "json_schema", schema: REASON_SCHEMA } },
      messages: [{ role: "user", content: buildPrompt(profile, rankedPostings) }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const parsed = JSON.parse(textBlock.text);
    const reasonById = new Map(parsed.reasons.map((entry) => [entry.postingId, entry.reason]));

    return rankedPostings.map((posting) => reasonById.get(posting.id) ?? templateReason(posting));
  } catch (error) {
    console.error("Claude reason generation failed, falling back to template reasons:", error.message);
    return rankedPostings.map((posting) => templateReason(posting));
  }
}
