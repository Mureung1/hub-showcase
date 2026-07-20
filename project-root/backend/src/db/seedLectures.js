// db/seedLectures.js
// 경북대 강의계획서 API(selectListLectPlnInqr)를 호출해서 lecture / lecture_time 테이블에 저장한다.
// 실행: node src/db/seedLectures.js
const supabase = require('./db');
const { requiredCoursesByDepartment } = require('../data/requiredCourses');

const API_URL =
  'https://knuin.knu.ac.kr/public/web/stddm/lsspr/syllabus/lectPlnInqr/selectListLectPlnInqr';

// year / semester / department 조합별로 수집 대상을 정의한다.
// estblDprtnCd를 비우면 훨씬 넓은 범위(단과대 전체 등)가 한 번에 오는 걸 확인했지만,
// 지금은 MVP 범위(내 전공)만 다루므로 학과 단위로 좁혀서 호출한다.
const TARGETS = [
  {
    estblYear: '2026',
    estblSmstrSctcd: 'CMBS001400002', // 2026학년도 2학기
    estblDprtnCd: '1O02', // 컴퓨터학부
    label: '컴퓨터학부',
  },
];

function buildPayload({ estblYear, estblSmstrSctcd, estblDprtnCd }) {
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
      isApi: 'Y',
      bldngSn: '',
      bldngCd: '',
      bldngNm: '',
      lssnsLcttmUntcd: '',
      sbjetSctcd2: '',
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

function isRequired(department, name) {
  const list = requiredCoursesByDepartment[department];
  return list ? list.includes(name) : false;
}

async function upsertLecture(row) {
  const semester = toSemester(row.estblYear, row.estblSmstrSctnm);
  const lecturePayload = {
    crse_no: row.crseNo,
    year: Number(row.estblYear),
    semester,
    name: row.sbjetNm,
    professor: row.totalPrfssNm,
    credit: Number(row.crdit),
    category: row.sbjetSctnm,
    department: row.estblDprtnNm,
    required: isRequired(row.estblDprtnNm, row.sbjetNm),
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
