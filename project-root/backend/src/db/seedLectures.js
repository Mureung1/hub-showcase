// db/seedLectures.js
// 경북대 강의계획서 API(selectListLectPlnInqr)를 호출해서 lecture / lecture_time 테이블에 저장한다.
// 실행: node src/db/seedLectures.js
const supabase = require('./db');
const { requiredCoursesByDepartment } = require('../data/requiredCourses');
const { courseTiersByDepartment } = require('../data/courseTiers');
const { parseTimes } = require('../utils/parseTimes');

const API_URL =
  'https://knuin.knu.ac.kr/public/web/stddm/lsspr/syllabus/lectPlnInqr/selectListLectPlnInqr';

// year / semester / department(또는 교과구분) 조합별로 수집 대상을 정의한다.
// estblDprtnCd를 비우면 훨씬 넓은 범위(단과대 전체 등)가 한 번에 오는 걸 확인했다.
// 교양은 학과 소속이 아니라 sbjetSctcd2(교과구분코드2)로 걸어야 전체가 잡힌다.
const TARGETS = [
  {
    estblYear: '2026',
    estblSmstrSctcd: 'CMBS001400002', // 2026학년도 2학기
    estblDprtnCd: '1O02', // 컴퓨터학부
    label: '컴퓨터학부',
  },
  {
    estblYear: '2026',
    estblSmstrSctcd: 'CMBS001400002', // 2026학년도 2학기
    estblDprtnCd: '', // 교양은 특정 학과 소속이 아니라 학과 필터를 비워야 전체가 잡힘
    sbjetSctcd2: 'STCU000800001', // 교과구분코드2: 교양
    label: '교양',
  },
];

function buildPayload({ estblYear, estblSmstrSctcd, estblDprtnCd, sbjetSctcd2 = '' }) {
  return {
    search: {
      estblYear,
      estblSmstrSctcd,
      sbjetCd: '',
      sbjetNm: '',
      crgePrfssNm: '',
      sbjetRelmCd: '',
      sbjetSctcd: '',
      estblDprtnCd,
      rmtCrseYn: '',
      rprsnLctreLnggeSctcd: '',
      flplnCrseYn: '',
      pstinNtnnvRmtCrseYn: '',
      dgGbDstrcRmtCrseYn: '',
      sugrdEvltnYn: '',
      prctsExrmnYn: '',
      gubun: '01',
      isApi: 'Y',
      bldngSn: '',
      bldngCd: '',
      bldngNm: '',
      lssnsLcttmUntcd: '',
      sbjetSctcd2,
      contents: '',
      lctreLnggeSctcd: 'ko',
      knuFtrDesigYn: '',
      cltreHmntsCltreYn: '',
      sdgCltreYn: '',
      rltmCrseYn: '',
      riseRmtCrseYn: '',
    },
  };
}

async function fetchLectures(target) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildPayload(target)),
  });
  if (!res.ok) {
    throw new Error(`API 요청 실패: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return json.data ?? [];
}

// "2026", "2학기" → "2026-2"
function toSemester(estblYear, estblSmstrSctnm) {
  const term = estblSmstrSctnm.startsWith('1') ? '1' : '2';
  return `${estblYear}-${term}`;
}

// 같은 전공필수 과목이 분반(crse_no의 -001/-002...)별로 여러 행 존재하는 경우,
// 전부 required=true로 두면 한 과목을 여러 번 들은 것처럼 학점이 중복 합산된다.
// 분반 중 하나만 대표로 required=true로 남기고 나머지는 required=false(일반 선택)로 둔다.
const requiredClaimed = new Set();

// requiredCoursesByDepartment에 수기로 큐레이션된 학과는 그 목록을 그대로 따른다(더 정확함 —
// 예: "알고리즘1은 필수, 알고리즘2는 선택" 같은 미묘한 구분은 API 카테고리만으론 못 잡음).
// 큐레이션이 없는 학과는 API의 category(교과구분, 예: "전공필수"/"교양필수")에 "필수"가 포함되면
// 자동으로 required=true로 본다 — 학과를 새로 추가할 때 이 파일에 수기 목록을 안 채워도 최소한의
// 전공필수 필터링이 동작하게 하기 위함. 그 외 나머지는 사용자 크라우드소싱 신고(required_course_report)로 보완한다.
function isRequired(department, name, category) {
  const list = requiredCoursesByDepartment[department];
  const isListed = list ? list.includes(name) : Boolean(category?.includes('필수'));
  if (!isListed) return false;

  const key = `${department}::${name}`;
  if (requiredClaimed.has(key)) return false;
  requiredClaimed.add(key);
  return true;
}

// courseTiers.js에 수기로 채워둔 값을 그대로 반영. 같은 과목이라도 교수마다 평가가 다르므로
// 과목명 + 교수명 조합으로 찾는다. 아직 평가 안 했거나 목록에 없는 조합은 null.
function getTier(department, name, professor) {
  return courseTiersByDepartment[department]?.[name]?.[professor] ?? null;
}

async function upsertLecture(row) {
  const semester = toSemester(row.estblYear, row.estblSmstrSctnm);
  // 일부 교양 과목은 estblDprtnNm(개설학과)이 비어있고 estblUnivNm(단과대학)만 채워져 있음
  const department = row.estblDprtnNm || row.estblUnivNm;
  const lecturePayload = {
    crse_no: row.crseNo,
    year: Number(row.estblYear),
    semester,
    name: row.sbjetNm,
    professor: row.totalPrfssNm,
    credit: Number(row.crdit),
    category: row.sbjetSctnm,
    department,
    required: isRequired(department, row.sbjetNm, row.sbjetSctnm),
    grade: row.estblGrade, // "1"~"4" 또는 학년 무관("*")
    tier: getTier(department, row.sbjetNm, row.totalPrfssNm),
  };

  const { data: lecture, error } = await supabase
    .from('lecture')
    .upsert(lecturePayload, { onConflict: 'year,semester,crse_no' })
    .select('id')
    .single();

  if (error) throw error;

  const times = parseTimes(row.lssnsRealTimeInfo);
  await supabase.from('lecture_time').delete().eq('lecture_id', lecture.id);
  if (times.length > 0) {
    const timeRows = times.map((t) => ({
      lecture_id: lecture.id,
      day: t.day,
      start_time: t.start,
      end_time: t.end,
    }));
    const { error: timeError } = await supabase.from('lecture_time').insert(timeRows);
    if (timeError) throw timeError;
  }
}

async function main() {
  for (const target of TARGETS) {
    console.log(`수집 중: ${target.label} (${target.estblYear} ${target.estblSmstrSctcd})`);
    const rows = await fetchLectures(target);
    console.log(`  받은 강의 수: ${rows.length}`);

    // crse_no 오름차순 정렬: 분반 중 대표(required=true)를 항상 같은 분반(-001 우선)으로 고정하기 위함
    rows.sort((a, b) => (a.crseNo ?? '').localeCompare(b.crseNo ?? ''));

    let saved = 0;
    let skipped = 0;
    for (const row of rows) {
      if (!row.crseNo || !row.lssnsRealTimeInfo) {
        skipped += 1;
        continue;
      }
      await upsertLecture(row);
      saved += 1;
    }
    console.log(`  저장: ${saved}건, 시간 정보 없어서 건너뜀: ${skipped}건`);
  }
  console.log('완료');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
