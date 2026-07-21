// db/seedLectures.js
// 경북대 강의계획서 API(selectListLectPlnInqr)를 호출해서 lecture / lecture_time 테이블에 저장한다.
// 실행: node src/db/seedLectures.js
const supabase = require('./db');
const { requiredCoursesByDepartment } = require('../data/requiredCourses');

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

// "화 09:00 ~ 10:30,목 10:30 ~ 12:00" → [{day:"화", start:"09:00", end:"10:30"}, ...]
function parseTimes(lssnsRealTimeInfo) {
  if (!lssnsRealTimeInfo) return [];
  return lssnsRealTimeInfo.split(',').map((chunk) => {
    const trimmed = chunk.trim();
    const spaceIdx = trimmed.indexOf(' ');
    const day = trimmed.slice(0, spaceIdx);
    const range = trimmed.slice(spaceIdx + 1);
    const [start, end] = range.split('~').map((s) => s.trim());
    return { day, start, end };
  });
}

// 같은 전공필수 과목이 분반(crse_no의 -001/-002...)별로 여러 행 존재하는 경우,
// 전부 required=true로 두면 한 과목을 여러 번 들은 것처럼 학점이 중복 합산된다.
// 분반 중 하나만 대표로 required=true로 남기고 나머지는 required=false(일반 선택)로 둔다.
const requiredClaimed = new Set();

function isRequired(department, name) {
  const list = requiredCoursesByDepartment[department];
  if (!list || !list.includes(name)) return false;

  const key = `${department}::${name}`;
  if (requiredClaimed.has(key)) return false;
  requiredClaimed.add(key);
  return true;
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
    required: isRequired(department, row.sbjetNm),
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
