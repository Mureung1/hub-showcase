// 한국장학재단 학자금지원정보(대학생) 수집기. 공공데이터포털 파일데이터를 자동 변환한 오픈API(odcloud).
// 월 1회 갱신되는 스냅샷이라 실시간은 아니고, 비어있는 장학 카테고리를 벌크로 채우는 용도. (docs/데이터-수집.md)
// 성적·소득 기준이 자유 문장이라 규칙으로 못 뽑는다. 장학은 설계상 needs_review로 두고(schema.md),
// 성적·소득 조건을 카드 근거로 보여줘 왜 확인 필요인지 알린다.
import { fileURLToPath } from "url";

const KEY = process.env.SCHOLARSHIP_API_KEY;
// UUID는 데이터셋 버전(월)마다 바뀐다. 아래는 2026-06-12 버전. 매월 갱신 때 최신 UUID로 교체해야 한다.
// 최신 UUID는 https://infuser.odcloud.kr/oas/docs?namespace=15028252/v1 의 경로 summary(날짜)로 확인.
const UUID = "16645324-7d91-4a1e-a603-a0f2e0029cbb";
const BASE = `https://api.odcloud.kr/api/15028252/v1/uddi:${UUID}`;

async function callApi(page, perPage) {
  const url = `${BASE}?page=${page}&perPage=${perPage}&serviceKey=${KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`장학재단 ${res.status}`);
  return res.json();
}

// 성적·소득 등 자유문장 조건을 한 줄로 묶어 카드 근거(text)로 쓴다. 빈 건 건너뛴다.
function eligibilityText(r) {
  const parts = [];
  if (r["성적기준 상세내용"]) parts.push(`성적: ${r["성적기준 상세내용"].replace(/\s+/g, " ").trim().slice(0, 80)}`);
  if (r["소득기준 상세내용"]) parts.push(`소득: ${r["소득기준 상세내용"].replace(/\s+/g, " ").trim().slice(0, 80)}`);
  return parts.join(" / ");
}

// 한 페이지. 반환: { totalCount, items:[{ title, org, deadline, url, text }] }
export async function fetchList(page = 1, perPage = 100) {
  const j = await callApi(page, perPage);
  const items = (j.data || []).map((r) => {
    const org = (r["운영기관명"] || "").trim();
    const name = (r["상품명"] || "").trim();
    const home = (r["홈페이지 주소"] || "").trim() || "https://www.data.go.kr/data/15028252/fileData.do";
    return {
      // 상품명이 "장학금"처럼 뭉툭한 게 많아 기관명을 붙여 구분(소스 간 중복제거 서명도 이걸 씀).
      title: org ? `[${org}] ${name}` : name,
      org,
      deadline: r["모집종료일"] || null,
      // url은 운영기관 홈페이지라 같은 기관 장학금끼리 겹친다. onConflict:url upsert에서 하나만 남고
      // 나머지가 날아가지 않게 번호를 프래그먼트로 붙여 고유하게 만든다(#은 브라우저에선 무시돼 홈으로 감).
      url: `${home}#s${r["번호"]}`,
      text: eligibilityText(r),
    };
  });
  return { totalCount: j.totalCount ?? 0, items };
}

// 직접 실행: 몇 건 찍어 장학재단 수집이 되는지 확인.
//   node sources/scholarship.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { totalCount, items } = await fetchList(1, 8);
  console.log(`한국장학재단 학자금(대학생) 총 ${totalCount}건\n`);
  for (const it of items) {
    console.log(`- ${it.title.slice(0, 40)} | 마감:${it.deadline ?? "?"} | ${it.text.slice(0, 50)}`);
  }
}
