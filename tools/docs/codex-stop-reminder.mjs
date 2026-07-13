import { spawnSync } from "node:child_process";

const status = spawnSync("git", ["status", "--porcelain"], {
  encoding: "utf8",
  windowsHide: true,
});

const hasChanges = status.status === 0 && status.stdout.trim().length > 0;
const message = hasChanges
  ? "변경 사항이 있습니다. 완료를 선언하기 전에 make check를 실행하고 관련 Work Record, ADR, 계약 문서와 검증 증거를 갱신했는지 확인하세요."
  : "Working tree 변경이 없습니다.";

process.stdout.write(JSON.stringify({
  continue: true,
  systemMessage: message,
}));
