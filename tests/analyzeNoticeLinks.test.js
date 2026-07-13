import assert from "node:assert/strict";
import test from "node:test";

import { createNoticeBriefsFromLinks, getNoticeBriefValue } from "../src/agents/noticeBriefAgent.js";
import { sampleAnalysisResults } from "../src/data/sampleAnalysisResults.js";
import { analyzeNoticeLinks } from "../src/services/analyzeNoticeLinks.js";

const links = [
  { id: "notice-1", sourceName: "테스트 출처", title: "첫 번째 공고", url: "https://example.com/1" },
  { id: "notice-2", sourceName: "테스트 출처", title: "두 번째 공고", url: "https://example.com/2" },
];

test("최신 공지 링크를 순차 분석하고 진행 상태를 전달한다", async () => {
  const calls = [];
  const progress = [];
  const analyze = async (payload) => {
    calls.push(payload.url);
    return sampleAnalysisResults[0];
  };

  const summary = await analyzeNoticeLinks({
    analyze,
    links,
    onProgress: (state) => progress.push(state),
    profile: { school: "경북대학교" },
  });

  assert.deepEqual(calls, links.map((link) => link.url));
  assert.equal(summary.successCount, 2);
  assert.equal(summary.failedCount, 0);
  assert.deepEqual(progress.map((state) => state.entry.status), [
    "analyzing",
    "complete",
    "analyzing",
    "complete",
  ]);
});

test("일부 분석 실패가 나도 나머지 공지를 계속 분석한다", async () => {
  const summary = await analyzeNoticeLinks({
    analyze: async ({ url }) => {
      if (url.endsWith("/1")) throw new Error("본문을 가져오지 못했습니다.");
      return sampleAnalysisResults[1];
    },
    links,
    profile: { school: "경북대학교" },
  });

  assert.equal(summary.successCount, 1);
  assert.equal(summary.failedCount, 1);
  assert.equal(summary.entries[0].status, "error");
  assert.equal(summary.entries[1].status, "complete");
});

test("표준 분석 결과를 공고 정보 필드로 변환한다", () => {
  const analysisByUrl = {
    [links[0].url]: {
      link: links[0],
      result: sampleAnalysisResults[0],
      status: "complete",
    },
  };
  const [brief] = createNoticeBriefsFromLinks([links[0]], analysisByUrl);

  assert.equal(brief.status, "complete");
  assert.notEqual(getNoticeBriefValue(brief, "announcementName"), "분석 대기");
  assert.notEqual(getNoticeBriefValue(brief, "deadline"), "분석 대기");
});

test("분석 완료 후 누락된 필드는 확인 필요로 표시한다", () => {
  const analysisByUrl = {
    [links[0].url]: {
      link: links[0],
      result: sampleAnalysisResults[3],
      status: "complete",
    },
  };
  const [brief] = createNoticeBriefsFromLinks([links[0]], analysisByUrl);

  assert.equal(getNoticeBriefValue(brief, "deadline"), "확인 필요");
});
