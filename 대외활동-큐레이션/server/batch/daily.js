// 배치. 수집 -> 매핑·파싱 -> 저장. 중복은 고유 키로 덮어쓰기. (docs/데이터-수집.md)
import cron from "node-cron";
import { fetchPolicies, toRaw } from "../sources/youthcenter.js";
import { parse } from "../parser/extract.js";

async function run() {
  // TODO(#4):
  // 1. fetchPolicies() 로 정책 목록
  // 2. toRaw() -> raw_postings 저장 (고유 키, 있으면 덮어쓰기)
  // 3. 구조 필드는 규칙 매핑, 자유 문장만 parse() -> postings, 실패는 needs_review
  // 4. 마감 D+1 지난 것 제외, 개수 급감·0건이면 알림
  console.log("batch run: TODO");
}

// 매일 새벽 4시. 배포 환경 타임존 확인.
cron.schedule("0 4 * * *", run);

// RUN_NOW=1 로 즉시 한 번 돌려보기
if (process.env.RUN_NOW) run();
