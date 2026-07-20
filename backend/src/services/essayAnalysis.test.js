import { describe, expect, it } from "vitest";
import { analyzeEssayQuestion } from "./essayAnalysis.js";

describe("analyzeEssayQuestion", () => {
  it("지원동기형 문항 + 전공/자격증/경험 모두 있는 프로필 → 우선순위 상위 2개(전공·자격증) 언급", () => {
    const profile = {
      major: "컴퓨터공학과",
      certificates: ["정보처리기사"],
      experience: "교내 창업 동아리 활동, 백엔드 개발 프로젝트 참여",
    };

    expect(analyzeEssayQuestion("지원 동기를 작성해주세요.", profile)).toBe(
      "이 문항은 지원 동기를 묻고 있어요. 회원님의 전공(컴퓨터공학과) · 자격증(정보처리기사) 내용을 구체적인 계기와 함께 풀어보면 좋아요.",
    );
  });

  it("경험사례형 문항(협업/사례 키워드) → 우선순위 상위 2개(경험·자격증) 언급", () => {
    const profile = {
      major: "컴퓨터공학과",
      certificates: ["정보처리기사"],
      experience: "교내 창업 동아리 활동, 백엔드 개발 프로젝트 참여",
    };

    expect(analyzeEssayQuestion("협업 경험 중 어려움을 극복한 사례를 작성해주세요.", profile)).toBe(
      "이 문항은 경험 사례를 묻고 있어요. 회원님의 경험(교내 창업 동아리 활동, 백엔드 개발 프로젝트 참여) · 자격증(정보처리기사) 내용을 구체적인 사례와 함께 풀어보면 좋아요.",
    );
  });

  it("전공/자격증/경험이 전부 비어있는 프로필 → 일반 폴백 문구", () => {
    const profile = { major: "", certificates: [], experience: "" };

    expect(analyzeEssayQuestion("지원 동기를 작성해주세요.", profile)).toBe(
      "회원님의 프로필에서 이 문항과 직접 연결할 전공·자격증·경험 정보를 찾지 못했어요. 지원 동기를 일반적인 관심 계기와 목표 중심으로 작성해보세요.",
    );
  });

  it("복수 자격증 매칭 → 자격증 항목을 쉼표로 나열", () => {
    const profile = {
      major: "컴퓨터공학과",
      certificates: ["정보처리기사", "SQLD"],
      experience: "교내 창업 동아리 활동, 백엔드 개발 프로젝트 참여",
    };

    expect(analyzeEssayQuestion("개발 관련 프로젝트/현장실습 경험을 구체적으로 작성해주세요.", profile)).toBe(
      "이 문항은 경험 사례를 묻고 있어요. 회원님의 경험(교내 창업 동아리 활동, 백엔드 개발 프로젝트 참여) · 자격증(정보처리기사, SQLD) 내용을 구체적인 사례와 함께 풀어보면 좋아요.",
    );
  });

  it("강점형 문항 → 자격증·전공 우선 언급", () => {
    const profile = { major: "컴퓨터공학과", certificates: ["정보처리기사"], experience: "" };

    expect(analyzeEssayQuestion("지원 직무와 관련해 본인의 강점을 작성해주세요.", profile)).toBe(
      "이 문항은 강점을 묻고 있어요. 회원님의 자격증(정보처리기사) · 전공(컴퓨터공학과) 내용을 구체적인 근거와 함께 풀어보면 좋아요.",
    );
  });

  it("기획형 문항 → 경험·전공 우선 언급", () => {
    const profile = { major: "경영학과", certificates: [], experience: "교내 창업 동아리 활동" };

    expect(analyzeEssayQuestion("제안하는 서비스 아이디어와 기획 배경을 작성해주세요.", profile)).toBe(
      "이 문항은 기획 아이디어를 묻고 있어요. 회원님의 경험(교내 창업 동아리 활동) · 전공(경영학과) 내용을 구체적인 아이디어와 함께 풀어보면 좋아요.",
    );
  });

  it("자격증만 있고 전공/경험은 없는 경우 → 매칭된 카테고리 하나만 언급 (maxLength는 함수 입력값이 아니므로 무관)", () => {
    const profile = { major: "", certificates: ["SQLD"], experience: "" };

    expect(analyzeEssayQuestion("관련 경험과 역량을 작성해주세요.", profile)).toBe(
      "이 문항은 경험 사례를 묻고 있어요. 회원님의 자격증(SQLD) 내용을 구체적인 사례와 함께 풀어보면 좋아요.",
    );
  });
});
