import { describe, expect, it } from "vitest";
import {
  extractActivityIds,
  extractNextData,
  extractActivity,
  mapActivityToPosting,
  isTestPosting,
  hasReasonableEssayLoad,
} from "./linkareer.js";

const RECRUIT_ACTIVITY = {
  organizationName: "LX글라스",
  title: "[LX글라스] 군산공장 생산기능직 채용",
  recruitCloseAt: 1785337199999,
  activityEndAt: null,
  organizationType: "대기업",
  applyDetail: "https://lx.recruiter.co.kr/career/jobs/122368",
  homepageURL: "https://www.lxglas.co.kr/ko",
  jobTypes: ["NEW"],
  rootCategories: [{ name: "생산/제조" }],
  regions: [{ name: "전라" }],
  regionDistricts: [{ name: "군산시" }],
  duties: {
    totalCount: 1,
    nodes: [
      {
        jobType: "NEW",
        categories: [{ name: "생산/공정관리" }, { name: "생산직/조립/가공" }],
        questionTemplates: [
          { id: "1", charMaxSize: 2000, content: "1. 지원동기와 입사 후 회사에서 이루고 싶은 꿈은 무엇인가요?\n\n" },
          { id: "2", charMaxSize: 2000, content: "2. 지원한 직무를 위해 필요한 역량은 무엇이라고 생각하나요?\n\n" },
        ],
      },
    ],
  },
};

const CONTEST_ACTIVITY = {
  organizationName: "국가보훈부",
  title: "[국가보훈부] 제27회 보훈문화상 공모전",
  recruitCloseAt: 1789743599999,
  activityEndAt: null,
  organizationType: "공공기관/공기업",
  applyDetail: "https://www.loud.kr/contest/view/207884/brief",
  homepageURL: "https://www.loud.kr/contest/view/207884/brief",
  jobTypes: [],
  rootCategories: [{ name: "기타" }],
  regions: [],
  regionDistricts: [],
  duties: { totalCount: 0, nodes: [] },
};

describe("extractActivityIds", () => {
  it("목록 페이지 HTML에서 /activity/{id} href를 중복 없이 등장 순서대로 추출한다", () => {
    const html = `
      <a href="/activity/1001">공고1</a>
      <a href="/activity/1002">공고2</a>
      <a href="/activity/1001">공고1 (중복 링크)</a>
    `;
    expect(extractActivityIds(html)).toEqual(["1001", "1002"]);
  });

  it("href가 하나도 없으면 빈 배열을 반환한다", () => {
    expect(extractActivityIds("<p>결과 없음</p>")).toEqual([]);
  });
});

describe("extractNextData / extractActivity", () => {
  it("__NEXT_DATA__ 스크립트 태그에서 JSON을 파싱한다", () => {
    const html = `<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"data":{"activityData":{"activity":{"title":"테스트"}}}}}}</script>`;
    const nextData = extractNextData(html);
    expect(extractActivity(nextData)).toEqual({ title: "테스트" });
  });

  it("스크립트 태그가 없으면 에러를 던진다", () => {
    expect(() => extractNextData("<html></html>")).toThrow();
  });
});

describe("isTestPosting", () => {
  it("제목에 '테스트'가 들어간 링커리어 내부 테스트 공고를 걸러낸다", () => {
    expect(isTestPosting({ title: "[테스트공고입니다] 링커리어 테스트 대외활동 - 4", organizationName: "링커리어기획팀테스트계정" })).toBe(true);
  });

  it("일반 실제 공고는 걸러내지 않는다", () => {
    expect(isTestPosting(RECRUIT_ACTIVITY)).toBe(false);
  });
});

describe("hasReasonableEssayLoad", () => {
  it("문항 6개 이하 + 총 글자수 8000자 이하는 통과시킨다", () => {
    const questions = [
      { question: "1", maxLength: 1000 },
      { question: "2", maxLength: 1000 },
    ];
    expect(hasReasonableEssayLoad(questions)).toBe(true);
  });

  it("문항이 6개를 넘으면 걸러낸다", () => {
    const questions = Array.from({ length: 7 }, (_, i) => ({ question: String(i), maxLength: 500 }));
    expect(hasReasonableEssayLoad(questions)).toBe(false);
  });

  it("문항 수는 적어도 총 글자수 합계가 8000자를 넘으면 걸러낸다", () => {
    const questions = [
      { question: "1", maxLength: 5000 },
      { question: "2", maxLength: 5000 },
    ];
    expect(hasReasonableEssayLoad(questions)).toBe(false);
  });
});

describe("mapActivityToPosting", () => {
  it("duties.questionTemplates가 있으면 실제 자소서 문항과 글자수 제한을 그대로 사용한다", () => {
    const posting = mapActivityToPosting(RECRUIT_ACTIVITY, { id: 1, category: "채용" });

    expect(posting.essayQuestions).toEqual([
      { question: "1. 지원동기와 입사 후 회사에서 이루고 싶은 꿈은 무엇인가요?", maxLength: 2000 },
      { question: "2. 지원한 직무를 위해 필요한 역량은 무엇이라고 생각하나요?", maxLength: 2000 },
    ]);
  });

  it("실제 필드 값을 스키마에 맞게 매핑한다 (org/title/deadline/field/applyMethod/conditions)", () => {
    const posting = mapActivityToPosting(RECRUIT_ACTIVITY, { id: 1, category: "채용" });

    expect(posting.org).toBe("LX글라스");
    expect(posting.title).toBe("[LX글라스] 군산공장 생산기능직 채용");
    expect(posting.deadline).toBe("2026-07-29");
    expect(posting.field).toBe("생산/공정관리 / 생산직/조립/가공");
    expect(posting.applyMethod).toBe("https://lx.recruiter.co.kr/career/jobs/122368");
    expect(posting.conditions).toEqual(["근무지역: 군산시", "기업형태: 대기업"]);
    expect(posting.keywords).toContain("생산/공정관리");
    expect(posting.gpaMin).toBe(0);
  });

  it("duties가 없는 공모전/대외활동 공고는 범용 자소서 문항으로 대체한다", () => {
    const posting = mapActivityToPosting(CONTEST_ACTIVITY, { id: 7, category: "공모전" });

    expect(posting.essayQuestions).toEqual([
      { question: "지원 동기를 작성해주세요.", maxLength: 500 },
      { question: "관련 경험과 역량을 작성해주세요.", maxLength: 500 },
    ]);
    expect(posting.field).toBe("기타");
    expect(posting.conditions).toEqual(["기업형태: 공공기관/공기업"]);
  });
});
