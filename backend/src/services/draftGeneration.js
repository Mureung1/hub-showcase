import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5";

const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    drafts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          draft: { type: "string" },
        },
        required: ["question", "draft"],
        additionalProperties: false,
      },
    },
  },
  required: ["drafts"],
  additionalProperties: false,
};

function templateDraft(essayQuestion, profile) {
  const experience = profile.experience || `${profile.major ?? "전공"} 지식과 관련 역량`;
  const draft = `"${essayQuestion.question}" 문항에는 "${experience}" 내용을 구체적인 사례로 녹여서 답변해보세요. (자동 생성에 실패해 기본 안내 문구가 표시되었습니다. 직접 작성해주세요.)`;
  return draft.slice(0, essayQuestion.maxLength);
}

function buildPrompt(profile, posting, essayQuestions) {
  const profileSummary = [
    `전공: ${profile.major}`,
    profile.doubleMajor && `복수전공: ${profile.doubleMajor}`,
    profile.minor && `부전공: ${profile.minor}`,
    profile.certificates?.length && `자격증: ${profile.certificates.join(", ")}`,
    profile.experience && `경험: ${profile.experience}`,
  ]
    .filter(Boolean)
    .join("\n");

  const questionsSummary = essayQuestions
    .map(
      (q, index) =>
        `${index + 1}. "${q.question}" (글자 수 제한: ${q.maxLength}자)\n   분석: ${q.analysis}`,
    )
    .join("\n");

  return `아래는 한 대학생의 프로필과, 지원하려는 공고, 그리고 자기소개서 문항별 분석이다.

[학생 프로필]
${profileSummary}

[지원 공고]
${posting.org} "${posting.title}" (분야: ${posting.field})

[자기소개서 문항]
${questionsSummary}

각 문항에 대해 학생의 프로필 정보를 반영한 자기소개서 초안을 한국어로 작성해줘. 각 초안은 지정된 글자 수 제한을 넘지 않아야 하고, 학생의 전공·자격증·경험 중 문항과 관련된 내용을 구체적인 사례로 녹여서 작성해.`;
}

export async function generateDrafts(profile, posting, essayQuestions) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not set");
    }

    const client = new Anthropic();

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      output_config: { format: { type: "json_schema", schema: DRAFT_SCHEMA } },
      messages: [{ role: "user", content: buildPrompt(profile, posting, essayQuestions) }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const parsed = JSON.parse(textBlock.text);
    const draftByQuestion = new Map(parsed.drafts.map((entry) => [entry.question, entry.draft]));

    return essayQuestions.map((q) => draftByQuestion.get(q.question) ?? templateDraft(q, profile));
  } catch (error) {
    console.error("Claude draft generation failed, falling back to template drafts:", error.message);
    return essayQuestions.map((q) => templateDraft(q, profile));
  }
}
