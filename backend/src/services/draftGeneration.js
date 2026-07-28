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

// 문항 수·글자 제한이 큰 실제 크롤링 공고(예: 5문항 x 1000자)는 고정 max_tokens로는
// JSON 출력이 잘려 파싱 실패 → 전체 문항이 폴백 문구로 표시되는 문제가 있었다.
// 문항별 글자 제한 합계에 비례해 예산을 늘리고, 과도한 응답을 막기 위해 상한을 둔다.
function calculateMaxTokens(essayQuestions) {
  const totalMaxLength = essayQuestions.reduce((sum, q) => sum + q.maxLength, 0);
  return Math.min(16000, Math.max(4096, totalMaxLength * 3 + 1000));
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
      max_tokens: calculateMaxTokens(essayQuestions),
      output_config: { format: { type: "json_schema", schema: DRAFT_SCHEMA } },
      messages: [{ role: "user", content: buildPrompt(profile, posting, essayQuestions) }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const parsed = JSON.parse(textBlock.text);

    // 실제 문항(번호·줄바꿈 포함)은 모델이 echo할 때 살짝 바뀔 수 있어 question 문자열로
    // 매칭하면 조용히 다 어긋난다. 요청한 순서 그대로 응답한다고 보고 인덱스로 매칭한다.
    if (!Array.isArray(parsed.drafts) || parsed.drafts.length !== essayQuestions.length) {
      throw new Error(
        `문항 수 불일치: 요청 ${essayQuestions.length}개, 응답 ${parsed.drafts?.length ?? 0}개`,
      );
    }

    return essayQuestions.map((q, index) => parsed.drafts[index].draft ?? templateDraft(q, profile));
  } catch (error) {
    console.error("Claude draft generation failed, falling back to template drafts:", error.message);
    return essayQuestions.map((q) => templateDraft(q, profile));
  }
}
