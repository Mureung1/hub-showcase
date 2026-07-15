import assert from "node:assert/strict";
import test from "node:test";

import {
  createNoticeLinkKey,
  findNewPostLinks,
} from "../src/agents/noticeLinkAgent.js";
import { sampleAnalysisResults } from "../src/data/sampleAnalysisResults.js";
import {
  analyzeNoticeLinks,
  deduplicateNoticeLinks,
} from "../src/services/analyzeNoticeLinks.js";

const pinnedNoticeUrl = "https://www.knu.ac.kr/wbbs/wbbs/bbs/btin/viewBtin.action?bbs_cde=1&btin.bbs_cde=1&btin.doc_no=12345&btin.page=1&menu_idx=67&popupDeco=";
const numberedNoticeUrl = "https://www.knu.ac.kr/wbbs/wbbs/bbs/btin/viewBtin.action?doc_no=12345&bbs_cde=1&btin.page=4&btin.search_type=subject&btin.search_text=AI";
const otherNoticeUrl = "https://www.knu.ac.kr/wbbs/wbbs/bbs/btin/viewBtin.action?bbs_cde=1&btin.doc_no=67890&btin.page=1";

const duplicatedLinks = [
  { id: "pinned", title: "공지 2026 AI 공모전", url: pinnedNoticeUrl },
  { id: "numbered", title: "2026 AI 공모전", url: numberedNoticeUrl },
];

test("KNU 고정 공지와 번호 공지가 같은 문서 번호이면 동일한 링크 키를 만든다", () => {
  assert.equal(createNoticeLinkKey(pinnedNoticeUrl), createNoticeLinkKey(numberedNoticeUrl));
  assert.notEqual(createNoticeLinkKey(pinnedNoticeUrl), createNoticeLinkKey(otherNoticeUrl));
});

test("일반 URL도 페이지, 추적, 해시와 파라미터 순서 차이를 무시한다", () => {
  const first = "https://example.com/notice/view?id=77&category=contest&page=1&utm_source=test#top";
  const second = "https://example.com/notice/view/?category=contest&id=77&page=8";

  assert.equal(createNoticeLinkKey(first), createNoticeLinkKey(second));
});

test("상세 공지 신호가 없는 목록 페이지 번호는 서로 다른 URL로 유지한다", () => {
  const firstPage = "https://example.com/notice/list?page=1";
  const secondPage = "https://example.com/notice/list?page=2";

  assert.notEqual(createNoticeLinkKey(firstPage), createNoticeLinkKey(secondPage));
});

test("신규 공지 판정에서 같은 공지를 한 번만 반환한다", () => {
  const links = [
    ...duplicatedLinks,
    { id: "other", title: "다른 공지", url: otherNoticeUrl },
  ];

  const newLinks = findNewPostLinks(links);
  const knownFilteredLinks = findNewPostLinks(links, [numberedNoticeUrl]);

  assert.equal(newLinks.length, 2);
  assert.deepEqual(newLinks.map((link) => link.id), ["pinned", "other"]);
  assert.deepEqual(knownFilteredLinks.map((link) => link.id), ["other"]);
});

test("분석 직전 같은 링크를 제거해 크롤링과 분석을 한 번만 실행한다", async () => {
  const calls = [];
  const progress = [];
  const uniqueLinks = deduplicateNoticeLinks(duplicatedLinks);
  const summary = await analyzeNoticeLinks({
    analyze: async ({ url }) => {
      calls.push(url);
      return sampleAnalysisResults[0];
    },
    links: duplicatedLinks,
    onProgress: (state) => progress.push(state),
    profile: { school: "경북대학교" },
  });

  assert.equal(uniqueLinks.length, 1);
  assert.deepEqual(calls, [pinnedNoticeUrl]);
  assert.equal(summary.total, 1);
  assert.equal(summary.successCount, 1);
  assert.equal(summary.duplicateCount, 1);
  assert.ok(progress.every((state) => state.total === 1));
});
