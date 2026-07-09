// 위비티 수집기. 목록도 상세도 정적 HTML 이라 headless 없이 긁는다. (docs/데이터-수집.md)
import * as cheerio from "cheerio";

export const LIST = (gp) => `https://www.wevity.com/?c=find&s=1&gp=${gp}&gbn=list`;
export const VIEW = (ix) => `https://www.wevity.com/?c=find&s=1&gbn=view&gp=1&ix=${ix}`;
const UA = "activity-curation bot (contact: 이메일)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// gp 를 1부터 늘리며 ix 모으기. 새 ix 안 나오면 멈춤. 요청 사이 3초.
export async function collectIds(maxPages = 10) {
  // TODO(2): fetch(LIST(gp)) -> cheerio -> ix 추출 -> 중복이면 멈춤
  // 목록 링크 패턴: gbn=view&gp=1&ix=숫자
  return [];
}

// 상세에서 뽑아 raw 포맷으로. 분야 -> majors(schema 표), 접수기간 끝 -> deadline, 참가조건 -> raw_text
export async function fetchPosting(ix) {
  // TODO(2): fetch(VIEW(ix)) -> cheerio 로 제목·분야·응모대상·접수기간·참가조건
  return {
    source_url: VIEW(ix),
    raw_title: "",
    raw_text: "",
    raw_html: "",
    scraped_at: new Date().toISOString(),
  };
}
