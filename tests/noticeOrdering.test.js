import assert from "node:assert/strict";
import test from "node:test";

import { parseNoticePublishedAt } from "../src/agents/noticeLinkAgent.js";
import {
  MAX_ALL_NOTICES_PER_SOURCE,
  mergeSourceNoticeLinks,
  sortNoticeLinksByPublishedOrder,
} from "../src/services/noticeOrdering.js";

function link(id, publishedAt, index, sourceId = "source") {
  return { id, index, publishedAt, sourceId, title: id, url: `https://example.com/${id}` };
}

test("여러 출처의 공지를 사이트 순서와 무관하게 게시일 최신순으로 정렬한다", () => {
  const result = sortNoticeLinksByPublishedOrder([
    link("a-old", "2026-07-20", 0, "a"),
    link("a-new", "2026-07-23", 1, "a"),
    link("b-newest", "2026-07-24", 0, "b"),
    link("b-middle", "2026-07-22", 1, "b"),
  ]);

  assert.deepEqual(result.map((item) => item.id), [
    "b-newest",
    "a-new",
    "b-middle",
    "a-old",
  ]);
});

test("게시일이 없으면 각 사이트의 목록 행 순서를 보조 기준으로 교차 정렬한다", () => {
  const result = sortNoticeLinksByPublishedOrder([
    link("a-1", null, 0, "a"),
    link("a-2", null, 1, "a"),
    link("b-1", null, 0, "b"),
    link("b-2", null, 1, "b"),
  ]);

  assert.deepEqual(result.map((item) => item.id), ["a-1", "b-1", "a-2", "b-2"]);
});

test("전체 모드는 출처별로 최대 10개를 선택한 뒤 전역 최신순으로 정렬한다", () => {
  const sourceA = Array.from({ length: 12 }, (_, index) => (
    link(`a-${index + 1}`, `2026-07-${String(23 - index).padStart(2, "0")}`, index, "a")
  ));
  const sourceB = Array.from({ length: 12 }, (_, index) => (
    link(`b-${index + 1}`, `2026-06-${String(23 - index).padStart(2, "0")}`, index, "b")
  ));
  const result = mergeSourceNoticeLinks([
    { allLinks: sourceA },
    { allLinks: sourceB },
  ], "allLinks", { perSourceLimit: MAX_ALL_NOTICES_PER_SOURCE });

  assert.equal(result.length, 20);
  assert.equal(result.filter((item) => item.sourceId === "a").length, 10);
  assert.equal(result.filter((item) => item.sourceId === "b").length, 10);
  assert.equal(result.some((item) => item.id === "a-11"), false);
  assert.equal(result.some((item) => item.id === "b-11"), false);
});

test("오래된 고정 공지가 목록 첫 행이어도 사이트별 최신 10개에서 제외한다", () => {
  const sourceLinks = [
    link("old-pinned", "2025-01-01", 0, "a"),
    ...Array.from({ length: 10 }, (_, index) => (
      link(`recent-${index + 1}`, `2026-07-${String(23 - index).padStart(2, "0")}`, index + 1, "a")
    )),
  ];
  const result = mergeSourceNoticeLinks(
    [{ allLinks: sourceLinks }],
    "allLinks",
    { perSourceLimit: MAX_ALL_NOTICES_PER_SOURCE },
  );

  assert.equal(result.length, 10);
  assert.equal(result.some((item) => item.id === "old-pinned"), false);
});

test("공지 목록의 일반적인 날짜 표기를 ISO 게시일로 변환한다", () => {
  assert.equal(parseNoticePublishedAt("등록일 2026.07.23 조회 20"), "2026-07-23");
  assert.equal(parseNoticePublishedAt("2026/7/9"), "2026-07-09");
  assert.equal(parseNoticePublishedAt("2026년 8월 1일"), "2026-08-01");
  assert.equal(parseNoticePublishedAt("2026.13.40"), null);
  assert.equal(parseNoticePublishedAt("날짜 없음"), null);
});
