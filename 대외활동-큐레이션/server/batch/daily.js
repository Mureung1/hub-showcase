// 새벽 배치. 수집 -> 파싱 -> 저장. 중복은 source_url 로 덮어쓰기.
import cron from "node-cron";
import { collectIds, fetchPosting } from "../scrapers/wevity.js";
import { parse } from "../parser/extract.js";

async function run() {
  // TODO(4):
  // 1. collectIds() 로 ix 목록
  // 2. 각 ix fetchPosting() -> raw_postings 저장 (source_url 유일 키, 있으면 덮어쓰기)
  // 3. 새 raw 만 parse() -> postings 저장, 실패는 needs_review
  // 4. 깨짐 감지: 0건이거나 빈 필드 급증하면 알림
  console.log("batch run: TODO");
}

// 매일 새벽 4시. 배포 환경 타임존 확인.
cron.schedule("0 4 * * *", run);

// RUN_NOW=1 로 즉시 한 번 돌려보기
if (process.env.RUN_NOW) run();
