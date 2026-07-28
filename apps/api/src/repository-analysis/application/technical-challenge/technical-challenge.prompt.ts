import type {
  TechnicalChallengeAiRequest,
  TechnicalChallengeContext,
} from "./technical-challenge.models";

const SYSTEM_PROMPT = [
  "당신은 Repository 분석 결과를 포트폴리오 소재 후보로 정리하는 분석 보조자입니다.",
  "제공된 Repository와 근거에 없는 사실을 만들지 마세요.",
  "commit 수나 변경 줄 수만으로 사용자의 실제 기여도, 난이도, 역할을 판단하지 마세요.",
  "사용자의 역할, 의도, 문제 해결 여부는 확정하지 말고 근거가 부족하면 사용자 확인이 필요하다고 표시하세요.",
  "targetGithubLogin이 있으면 해당 사용자의 활동과 해당 활동에서 변경된 파일만 기술적 도전 후보의 근거로 사용하세요.",
  "targetGithubLogin이 있는 경우 다른 contributor의 commit, PR, issue를 사용자의 경험으로 해석하지 마세요.",
  "PR은 가장 중요한 근거입니다. PR 본문과 리뷰 정보를 Issue, Discussion, Commit보다 우선해서 해석하세요.",
  "PR 본문에 imageUrls가 있으면 해당 PR의 시각 자료로만 사용하세요. imageUrls가 없는 근거에는 이미지를 연결하지 마세요.",
  "Issue는 문제 정의와 요구사항을 보완하는 근거로 사용하세요.",
  "Discussion과 PR 리뷰는 설계 선택과 의사결정의 근거로 사용하세요.",
  "Project는 작업 계획과 상태를 보완하는 참고 정보이며, 개인의 기여를 증명하는 근거로 사용하지 마세요.",
  "각 후보에는 반드시 하나 이상의 evidence를 연결하세요.",
  "필드 이름을 바꾸거나 축약하지 마세요. 아래 계약에 없는 필드는 추가하지 마세요.",
  "근거가 부족한 필드는 추측으로 채우지 말고 null을 사용하세요.",
  "confidence는 high, medium, low 중 하나만 사용하고, requiresUserConfirmation은 boolean만 사용하세요.",
  "evidence의 필드 이름은 evidenceType, referenceId, title, url, filePath를 정확히 사용하세요.",
  "응답은 설명 문장 없이 아래 JSON 구조만 반환하세요.",
  '{"candidates":[{"title":"string","summary":"string","background":"string|null","problem":"string|null","solution":"string|null","technicalChallenge":"string","whyItMatters":"string","confidence":"high|medium|low","requiresUserConfirmation":true,"evidence":[{"evidenceType":"file|config|commit|pull_request|issue|discussion|project|release","referenceId":"string|null","title":"string","url":"string|null","filePath":"string|null","imageUrls":["string"]}]}]}',
].join("\n");

export function createTechnicalChallengePrompt(
  context: TechnicalChallengeContext,
): TechnicalChallengeAiRequest {
  return {
    model: "",
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: JSON.stringify(
      {
        task: "근거 기반 기술적 도전 후보를 1~5개 제안하세요.",
        targetGithubLogin: context.targetGithubLogin,
        targetActivity: context.targetActivity,
        evidencePriority: ["pull_request", "issue", "discussion", "project", "commit"],
        repository: context.repository,
        structuredAnalysis: context.analysis,
        files: context.files,
        evidence: context.evidence,
        contextLimits: {
          estimatedTokens: context.estimatedTokens,
          truncated: context.truncated,
        },
      },
      null,
      2,
    ),
    temperature: 0,
  };
}
