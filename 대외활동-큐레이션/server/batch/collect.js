// 자동 수집기 (다중 소스 총망라 + 중복 제거). 여러 곳을 페이지 끝까지 크롤 -> 정규화로 중복 합치기 -> Supabase upsert.
// 지역·조건 안 가리고 전국/제한없음 전부 모은다(총망라). 부산·국립대·과학 우선은 "정렬/필터"에서 처리, 수집에서 안 버린다.
// service key 로 쓰므로 손 붙여넣기 불필요. url 유일키(같은 소스 중복) + 제목 정규화(소스 간 중복) 두 겹으로 막는다.
//   node batch/collect.js
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import * as contestkorea from "../sources/contestkorea.js";
import * as wevity from "../sources/wevity.js";
import * as busan from "../sources/busan_youth.js";
import * as seoul from "../sources/seoul_youth.js";
import * as linkareer from "../sources/linkareer.js";
import * as youthcenter from "../sources/youthcenter.js";
import * as scholarship from "../sources/scholarship.js";
import { deriveRegionFromDistrict } from "../regionLookup.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const today = new Date().toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 놓침 방지 자동화(총망라): 페이지 수를 손으로 안 정하고, "마감 지난 게 연속 N건 나오면 그 소스는 그만 긁는다"로
// 실제 규모에 자동으로 맞춘다. 이 로직 자체가 실패해도 안 멈추는 사고를 막기 위해, 절대 상한(HARD_MAX_PAGES)을
// 독립적으로 같이 둔다(비용 안전장치와 같은 이중 방어 원칙 - 하나만 믿지 않는다).
const CONSECUTIVE_EXPIRED_STOP = 30;
// 실측 확인(콘코 10페이지): 마감 지난 게 뭉쳐서 안 나오고 흩어져 있어, 연속감지가 실제로는 잘 안 걸릴 수 있다.
// 그래서 절대 상한(HARD_MAX_PAGES)이 사실상의 진짜 제동장치다. 15페이지(약 1,500건/소스)는 이미 실측 검증된
// 범위(863/1,026건 살아있음 확인)라 실행 시간도 감당 가능한 선에서 잡았다.
const HARD_MAX_PAGES = 15;
// 온통청년은 상세페이지 요청 없이 한 콜에 100건씩 오는 가벼운 API라 위 상한(느린 소스 기준)을 그대로
// 적용하면 안 된다. 실측(2649건, 20260721)보다 넉넉하게 40페이지(4000건)까지 열어둔다.
const YOUTHCENTER_MAX_PAGES = 40;
const base = { grades: [], majors: [], regions: [], enrollment: [], incomeMax: null, gpaMin: null };

// 마감일 문자열(YYYY-MM-DD)이 오늘보다 이전이면 지난 것. null(상시)은 안 지난 것으로 본다.
function isExpired(deadline) {
  return !!deadline && deadline < today;
}

// 소스 간 중복 판별용 제목 정규화: 괄호 기호만 벗기고 안 내용은 남긴다(기호·공백 제거, 소문자화).
// 대괄호 안 내용을 통째로 지우면 "[부산] OO 공모전"과 "[서울] OO 공모전"처럼 지역만 다른 서로 다른
// 공고가 같은 서명으로 뭉쳐 하나가 놓칠 수 있다(총망라 원칙과 충돌). 괄호만 벗겨 내용은 지킨다.
function sig(title) {
  return (title || "").replace(/[[\]()]/g, "").replace(/[^0-9a-z가-힣]/gi, "").toLowerCase();
}

// 주최기관명에 지자체 신호가 있으면 true. 완벽한 판별은 불가능하다(예: 기초자치단체명 전부는 못 커버).
// 애매하면 확인 필요로 두는 게 원칙이라, 놓치는 쪽(false negative)보다 과탐(false positive)이 안전하다.
const REGION_NAMES = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주", "충청", "전라", "경상"];
function isLocalGovOrg(org) {
  if (!org) return false;
  const hasRegion = REGION_NAMES.some((r) => org.includes(r));
  const hasAdminWord = /구청|시청|군청|도청|자치구|광역시|특별시|복지관|사회복지협의회|문화재단|청년센터|청소년재단|평생학습관/.test(org);
  const nationalSignal = /전국|정부|중앙|문화체육관광부|교육부|대한민국|국립/.test(org);
  return (hasRegion || hasAdminWord) && !nationalSignal;
}

// 콘코: 참가대상 -> 대학생 대상 여부(규칙). 나머지 자유문장은 이후 LLM.
function contestEligibility(target, body) {
  const t = (target || "").replace(/\s+/g, "");
  const forUniv = /누구나|일반인|대학생|대학원생|청년/.test(t);
  // "영등포구민만" 처럼 한 도시에만 있는 구·군 이름이 원문에 있으면 그 시·도로 지역을 채운다(겹치는
  // 구 이름은 regionLookup.js가 알아서 빈 배열로 둔다 - 못 맞추면 무관이 아니라 확인 필요로 가야 하니
  // isLocalGovOrg 등 다른 안전장치가 여전히 커버한다).
  const regions = deriveRegionFromDistrict((target || "") + " " + (body || ""));
  return { ...base, regions, forUniv, text: (target || "").replace(/\s+/g, " ").trim() };
}

async function collectContestkorea() {
  const rows = [];
  let consecutiveExpired = 0;
  for (let p = 1; p <= HARD_MAX_PAGES; p++) {
    let list;
    try { list = await contestkorea.fetchList(p); }
    catch (e) { console.log(`콘코: 목록(페이지 ${p}) 요청 실패(${e.message}), 여기까지만 수집`); break; }
    if (!list.length) break;
    let stop = false;
    for (const it of list) {
      let d;
      try { d = await contestkorea.fetchDetail(it.sourceUrl); }
      catch (e) { console.log(`콘코: 상세 요청 실패(${e.message}), 이 건 건너뜀 - ${it.sourceUrl}`); continue; } // 한 건 실패로 전체가 죽지 않게
      consecutiveExpired = isExpired(d.deadline) ? consecutiveExpired + 1 : 0;
      if (consecutiveExpired >= CONSECUTIVE_EXPIRED_STOP) { stop = true; break; }
      if ((d.field || "").includes("배우") && (d.field || "").includes("오디션")) continue; // 이력에 안 맞는 분야(오디션·단역 등) 제외
      const elig = contestEligibility(d.target, d.rawText);
      if (!elig.forUniv) continue; // 대학생 대상 아니면 수집 제외
      // "OO 거주자만/시민만" 같은 지역 제한 문구가 있으면, 아직 지역을 못 뽑아서(LLM 몫) 잘못 "가능"으로
      // 뜨지 않게 확인 필요로 둔다. (애매하면 확인 필요로, 제품 결정)
      const hasRegionRestriction = /거주자|관내 거주|주민만|시민 및/.test(d.target + d.rawText) || isLocalGovOrg(d.host);
      rows.push({ title: d.title || it.title, org: d.host, category: "공모전", track: "activity", source: "콘테스트코리아", url: it.sourceUrl, deadline: d.deadline, posted_at: today, parse_status: hasRegionRestriction ? "needs_review" : "curated", eligibility: elig });
      await sleep(350);
    }
    if (stop) { console.log(`콘코: 연속 마감 ${CONSECUTIVE_EXPIRED_STOP}건, 페이지 ${p}에서 중단`); break; }
  }
  return rows;
}

async function collectWevity() {
  const rows = [];
  let consecutiveExpired = 0;
  for (let p = 1; p <= HARD_MAX_PAGES; p++) {
    let list;
    try { list = await wevity.fetchList(p); }
    catch (e) { console.log(`위비티: 목록(페이지 ${p}) 요청 실패(${e.message}), 여기까지만 수집`); break; }
    if (!list.length) break;
    let stop = false;
    for (const it of list) {
      consecutiveExpired = isExpired(it.deadline) ? consecutiveExpired + 1 : 0;
      if (consecutiveExpired >= CONSECUTIVE_EXPIRED_STOP) { stop = true; break; }
      rows.push({ title: it.title, org: "", category: "공모전", track: "activity", source: "위비티", url: it.sourceUrl, deadline: it.deadline, posted_at: today, parse_status: "curated", eligibility: { ...base, forUniv: true, text: `분야: ${it.cats}` } });
    }
    if (stop) { console.log(`위비티: 연속 마감 ${CONSECUTIVE_EXPIRED_STOP}건, 페이지 ${p}에서 중단`); break; }
    await sleep(300);
  }
  return rows;
}

async function collectBusan() {
  const rows = [];
  // 부산청년플랫폼은 게시글에 마감일이 없어(상시 성격) 연속마감감지가 안 통한다. 게시판 자체가 작아서(수십 건)
  // 빈 페이지를 만나면 자연히 멈춘다 - 그래도 절대 상한은 같이 둔다.
  for (let p = 1; p <= 10; p++) {
    let list;
    try { list = await busan.fetchList(p); }
    catch (e) { console.log(`부산: 목록(페이지 ${p}) 요청 실패(${e.message}), 여기까지만 수집`); break; }
    if (!list.length) break;
    for (const it of list) {
      rows.push({ title: it.title, org: it.dept, category: "지자체", track: "activity", source: "부산청년플랫폼", url: it.sourceUrl, deadline: null, posted_at: it.postedAt || today, parse_status: "needs_review", eligibility: { ...base, regions: ["부산"], forUniv: true, text: `담당: ${it.dept}` } });
    }
    await sleep(300);
  }
  return rows;
}

// 서울 청년몽땅정보통: 부산청년플랫폼의 서울판. 게시글에 마감일이 구조 필드로 없어 needs_review로,
// 지역은 서울로 둔다. 게시판이 작아(수십 건) 빈 페이지에서 자연히 멈춘다.
async function collectSeoul() {
  const rows = [];
  for (let p = 1; p <= 10; p++) {
    let list;
    try { list = await seoul.fetchList(p); }
    catch (e) { console.log(`서울: 목록(페이지 ${p}) 요청 실패(${e.message}), 여기까지만 수집`); break; }
    if (!list.length) break;
    for (const it of list) {
      rows.push({ title: it.title, org: "서울시", category: "지자체", track: "activity", source: "서울청년몽땅정보통", url: it.sourceUrl, deadline: null, posted_at: today, parse_status: "needs_review", eligibility: { ...base, regions: ["서울"], forUniv: true, text: "" } });
    }
    await sleep(300);
  }
  return rows;
}

async function collectLinkareer() {
  const rows = [];
  for (const t of linkareer.TYPES) {
    let consecutiveExpired = 0;
    for (let p = 1; p <= HARD_MAX_PAGES; p++) {
      let items, totalCount;
      try { ({ items, totalCount } = await linkareer.fetchList(t.id, p, 20)); }
      catch (e) { console.log(`링커리어(유형${t.id}): 목록(페이지 ${p}) 요청 실패(${e.message}), 여기까지만 수집`); break; }
      let stop = false;
      for (const it of items) {
        consecutiveExpired = isExpired(it.deadline) ? consecutiveExpired + 1 : 0;
        if (consecutiveExpired >= CONSECUTIVE_EXPIRED_STOP) { stop = true; break; }
        if (!it.forUniv) continue; // 청소년 전용 등 대학생 대상 아니면 수집 제외
        if (it.isNoise) continue; // 친목·스포츠레저 캐주얼 동아리(이력에 안 맞음) 제외
        const parseStatus = isLocalGovOrg(it.org) ? "needs_review" : "curated";
        rows.push({ title: it.title, org: it.org, category: t.category, track: "activity", source: "링커리어", url: it.sourceUrl, deadline: it.deadline, posted_at: today, parse_status: parseStatus, eligibility: { ...base, regions: deriveRegionFromDistrict(`${it.title} ${it.org || ""}`), forUniv: true, text: "" } });
      }
      if (stop) { console.log(`링커리어(유형${t.id}): 연속 마감 ${CONSECUTIVE_EXPIRED_STOP}건, 페이지 ${p}에서 중단`); break; }
      if (p * 20 >= totalCount) break;
      await sleep(300);
    }
  }
  return rows;
}

// 온통청년: 지역이 이미 구조 필드로 와서(실측 확인) 규칙만으로 충분 - needs_review로 낮추지 않는다.
// 중분류(mclsfNm)가 "교육비지원"이면 장학 성격이라 카테고리를 장학으로, 나머지는 지자체로 둔다.
function youthcenterCategory(mclsfNm) {
  return mclsfNm === "교육비지원" ? "장학" : "지자체";
}

async function collectYouthcenter() {
  const rows = [];
  let consecutiveExpired = 0;
  for (let p = 1; p <= YOUTHCENTER_MAX_PAGES; p++) {
    let items, totalCount;
    try { ({ items, totalCount } = await youthcenter.fetchList(p, 100)); }
    catch (e) { console.log(`온통청년: 목록(페이지 ${p}) 요청 실패(${e.message}), 여기까지만 수집`); break; }
    if (!items.length) break;
    let stop = false;
    for (const it of items) {
      consecutiveExpired = isExpired(it.deadline) ? consecutiveExpired + 1 : 0;
      if (consecutiveExpired >= CONSECUTIVE_EXPIRED_STOP) { stop = true; break; }
      // enrollment: 참여제외대상에 "재학생"이 있으면 졸업예정만(실측 확인). forUniv는 그대로 true로
      // 두고(온통청년 자체가 청년정책 포털이라 대학생도 기본 대상), enrollment로 더 좁힌다.
      // 지역: zipCd에서 온 것(it.regions) + 제목·기관명에서 뽑은 것을 합친다. zipCd가 비어 무관([])으로
      // 오는 경우가 많아, "광주청년..." 같은 제목의 지자체 정책이 전국으로 잘못 뜨는 걸 제목으로 보완한다.
      const regions = [...new Set([...it.regions, ...deriveRegionFromDistrict(`${it.title} ${it.org || ""}`)])];
      rows.push({ title: it.title, org: it.org, category: youthcenterCategory(it.mclsfNm), track: "activity", source: "온통청년", url: it.sourceUrl, deadline: it.deadline, posted_at: today, parse_status: "curated", eligibility: { ...base, regions, enrollment: it.enrollment, forUniv: true, text: it.text.slice(0, 300) } });
    }
    if (stop) { console.log(`온통청년: 연속 마감 ${CONSECUTIVE_EXPIRED_STOP}건, 페이지 ${p}에서 중단`); break; }
    if (p * 100 >= totalCount) break;
    await sleep(300);
  }
  return rows;
}

// 한국장학재단: 월 1회 갱신 스냅샷(1,850건). 성적·소득 기준이 자유문장이라 규칙으로 못 뽑아
// 장학은 needs_review(확인 필요)로 두고, 성적·소득 조건을 카드 근거(text)로 보여준다.
async function collectScholarship() {
  const rows = [];
  for (let p = 1; p <= 20; p++) {
    let items, totalCount;
    try { ({ items, totalCount } = await scholarship.fetchList(p, 100)); }
    catch (e) { console.log(`장학재단: 목록(페이지 ${p}) 요청 실패(${e.message}), 여기까지만 수집`); break; }
    if (!items.length) break;
    for (const it of items) {
      rows.push({ title: it.title, org: it.org, category: "장학", track: "scholarship", source: "한국장학재단", url: it.url, deadline: it.deadline, posted_at: today, parse_status: "needs_review", eligibility: { ...base, forUniv: true, text: it.text.slice(0, 300) } });
    }
    if (p * 100 >= totalCount) break;
    await sleep(300);
  }
  return rows;
}

// DB의 모든 제목을 페이지 없이 다 가져온다. Supabase select는 기본 1000행 제한이 있어(실측으로 드러난 버그),
// range로 넘기지 않으면 DB가 커질수록 중복체크가 앞쪽 1000건만 보고 나머지는 못 걸러낸다.
async function fetchAllTitles() {
  const titles = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabase.from("postings").select("title").range(from, from + step - 1);
    if (error) throw error;
    titles.push(...data);
    if (data.length < step) break;
    from += step;
  }
  return titles;
}

async function run() {
  // 소스 하나가 실패해도(일시적 5xx 등) 나머지 소스가 이미 모은 건 버리지 않는다(allSettled).
  const settled = await Promise.allSettled([collectContestkorea(), collectWevity(), collectBusan(), collectSeoul(), collectLinkareer(), collectYouthcenter(), collectScholarship()]);
  const names = ["콘코", "위비티", "부산", "서울", "링커리어", "온통청년", "장학재단"];
  const groups = settled.map((s, i) => {
    if (s.status === "rejected") { console.log(`${names[i]}: 전체 실패(${s.reason?.message}), 0건으로 처리`); return []; }
    return s.value;
  });
  const all = groups.flat();

  // 소스 간 중복 제거: 이미 DB 에 있는 제목 서명 + 이번 배치 안 중복을 함께 막는다.
  const existing = await fetchAllTitles();
  const seen = new Set(existing.map((r) => sig(r.title)));
  const rows = [];
  let dup = 0;
  for (const r of all) {
    const s = sig(r.title);
    if (s && seen.has(s)) { dup++; continue; }
    seen.add(s);
    rows.push(r);
  }

  const { data, error } = await supabase.from("postings").upsert(rows, { onConflict: "url", ignoreDuplicates: true }).select("id");
  if (error) throw error;
  console.log(`수집: 콘코 ${groups[0].length} + 위비티 ${groups[1].length} + 부산 ${groups[2].length} + 서울 ${groups[3].length} + 링커리어 ${groups[4].length} + 온통청년 ${groups[5].length} + 장학재단 ${groups[6].length} = ${all.length}건`);
  console.log(`제목 중복 ${dup}건 걸러냄. DB 신규 저장 ${data.length}건.`);
}

run().catch((e) => { console.error("수집 실패:", e.message); process.exit(1); });
