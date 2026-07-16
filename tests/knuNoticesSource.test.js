import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { parseKnuNoticesList } from "../server/sources/adapters/knuNoticesSource.js";
import { NoticeDiscoveryError } from "../server/sources/sourceFetch.js";

const fixture = readFileSync(
  new URL("../server/sources/__fixtures__/knu-notices-list.html", import.meta.url),
  "utf8",
);

test("KNU 공지 어댑터는 제목, 절대 URL, 게시일을 추출하고 상단 중복을 제거한다", () => {
  const candidates = parseKnuNoticesList(fixture, { discoveredAt: "2026-07-16T00:00:00.000Z" });

  assert.equal(candidates.length, 2);
  assert.equal(candidates[0].title, "[공지] 2026 AI 소프트웨어 공모전 참가자 모집");
  assert.equal(candidates[0].publishedAt, "2026-07-16");
  assert.equal(candidates[0].id, "knu-main-notices:1:1337896");
  assert.match(candidates[0].url, /^https:\/\/www\.knu\.ac\.kr\/wbbs\/wbbs\/bbs\/btin\/viewBtin\.action\?/);
  assert.match(candidates[0].url, /btin\.doc_no=1337896/);
});

test("KNU 공지 어댑터는 제목 기준 키워드 필터를 적용한다", () => {
  const candidates = parseKnuNoticesList(fixture, { keyword: "봉사" });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].title, "2026년 여름방학 봉사활동 참가자 모집");
});

test("KNU 공지 어댑터는 목록 테이블이 없으면 파싱 실패를 알린다", () => {
  assert.throws(
    () => parseKnuNoticesList("<main>변경된 페이지</main>"),
    (error) => error instanceof NoticeDiscoveryError && error.code === "parse_failed",
  );
});
