#!/usr/bin/env node
// 업스트림 오링크 방지 검사기. commit-msg 훅(.githooks/commit-msg)이 커밋 메시지는 자동으로 막지만,
// PR 제목·본문(gh pr create --body-file)은 git 훅 대상이 아니라서 이 스크립트로 수동 점검한다.
// submit-daily-pr 스킬은 gh pr create 직전 이 스크립트를 반드시 돌린다(docs/pr-guide.md).
//
// 사용: node scripts/check-no-bare-issue-refs.mjs <파일1> [파일2 ...]
//       또는 stdin: echo "$TITLE" | node scripts/check-no-bare-issue-refs.mjs -

import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("사용법: node scripts/check-no-bare-issue-refs.mjs <파일...>  (또는 '-' 로 stdin)");
  process.exit(2);
}

function readInput(path) {
  if (path === "-") {
    return readFileSync(0, "utf8");
  }
  return readFileSync(path, "utf8");
}

function findBareRefs(text) {
  // 안전한 형태(owner/repo#27, 전체 URL)는 먼저 지운다.
  const stripped = text
    .replace(/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+#[0-9]+/g, "")
    .replace(/https?:\/\/\S+/g, "");
  return stripped.match(/#[0-9]+/g) ?? [];
}

let hasHit = false;
for (const path of args) {
  const text = readInput(path);
  const hits = findBareRefs(text);
  if (hits.length > 0) {
    hasHit = true;
    console.error(`✋ ${path}: bare 이슈번호 발견 → ${hits.join(", ")}`);
  }
}

if (hasHit) {
  console.error("");
  console.error("이 저장소의 PR은 업스트림 공용 저장소로 올라갑니다.");
  console.error("bare '#27' 은 업스트림의 같은 번호(=다른 참가자 이슈)로 자동 링크되어");
  console.error("그 사람 이슈에 '언급됨' 이벤트가 남습니다(수정해도 지워지지 않음, 2026-07-21 실사고).");
  console.error("→ 번호 없이 기능명으로 쓰거나, 꼭 필요하면 'bricepark94/hub#27' 전체 경로로 쓰세요.");
  process.exit(1);
}

console.log("✅ bare 이슈번호 없음 — 안전합니다.");
