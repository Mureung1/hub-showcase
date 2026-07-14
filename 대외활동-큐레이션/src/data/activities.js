// 대외활동/공모전/장학/봉사 mock 데이터 + 스키마
//
// eligibility(자격요건)는 "이 조건들을 모두 만족해야 지원 가능"을 뜻한다.
// 빈 배열([]) 또는 null 은 "무관(누구나 가능)"으로 해석한다.
// parseStatus 가 "needs_review" 면 원문을 제대로 못 읽은 것이라 판정 없이 "확인 필요"로 보낸다.
//
// @typedef Activity
// @property {string} id
// @property {string} title
// @property {string} org
// @property {'대외활동'|'공모전'|'장학'|'봉사'} category
// @property {'activity'|'scholarship'} track
// @property {string} source            수집 출처
// @property {string} url
// @property {string} deadline          마감일 (YYYY-MM-DD)
// @property {string} postedAt          등록일 (YYYY-MM-DD, 최신순 정렬용)
// @property {'curated'|'needs_review'} parseStatus
// @property {object} eligibility
// @property {number[]} eligibility.grades      허용 학년, [] = 무관
// @property {string[]} eligibility.majors      허용 전공(canonical 8), [] = 무관
// @property {string[]} eligibility.regions     허용 지역(canonical 13), [] = 무관
// @property {string[]} eligibility.enrollment  허용 재학상태, [] = 무관
// @property {number|null} eligibility.ageMin   최소 만 나이, null = 무관
// @property {number|null} eligibility.ageMax   최대 만 나이, null = 무관
// @property {number|null} eligibility.incomeMax 소득분위 상한(이하), null = 무관
// @property {number|null} eligibility.gpaMin   최소 학점(이상), null = 무관
// @property {string} eligibilityText           원문 자격요건 문장 (판정 근거)

export const MAJORS = ["인문", "경영", "경제", "교육", "과학", "IT", "의학", "예술"];
export const REGIONS = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "강원", "충청", "전라", "경상", "제주"];
export const ENROLLMENTS = ["재학", "휴학", "졸업예정"];

const base = { grades: [], majors: [], regions: [], enrollment: [], ageMin: null, ageMax: null, incomeMax: null, gpaMin: null };

/** @type {Activity[]} */
export const ACTIVITIES = [
  {
    id: "a1", title: "대학생 IT 서포터즈 12기", org: "OO소프트", category: "대외활동", track: "activity",
    source: "링커리어", url: "https://linkareer.com/activity/1", deadline: "2026-07-22", postedAt: "2026-07-11", parseStatus: "curated",
    eligibility: { ...base, majors: ["IT"], enrollment: ["재학"] },
    eligibilityText: "IT 계열 재학생 대상. 학년·지역 무관.",
  },
  {
    id: "a2", title: "청년 창업 아이디어 공모전", org: "창업진흥원", category: "공모전", track: "activity",
    source: "콘테스트코리아", url: "https://contestkorea.com/2", deadline: "2026-08-05", postedAt: "2026-06-25", parseStatus: "curated",
    eligibility: { ...base, ageMin: 19, ageMax: 34 },
    eligibilityText: "만 19~34세 청년 누구나 지원 가능.",
  },
  {
    id: "a3", title: "서울 청년 활동 지원금", org: "서울시", category: "장학", track: "scholarship",
    source: "온통청년", url: "https://youthcenter.go.kr/3", deadline: "2026-07-30", postedAt: "2026-07-12", parseStatus: "needs_review",
    eligibility: { ...base, enrollment: ["재학"] },
    eligibilityText: "자격요건 원문이 우대·필수 구분 없이 적혀 있어 확인이 필요함.",
  },
  {
    id: "a4", title: "지역아동센터 교육봉사", org: "지역아동센터", category: "봉사", track: "activity",
    source: "1365", url: "https://1365.go.kr/4", deadline: "2026-07-28", postedAt: "2026-07-08", parseStatus: "curated",
    eligibility: { ...base, regions: ["서울", "경기", "인천"] },
    eligibilityText: "수도권(서울·경기·인천) 거주자, 주 1회 이상 참여 가능자.",
  },
  {
    id: "a5", title: "공학 전공심화 학회 지원사업", org: "□□대학교", category: "대외활동", track: "activity",
    source: "대학공지", url: "https://example.ac.kr/5", deadline: "2026-07-25", postedAt: "2026-07-09", parseStatus: "curated",
    eligibility: { ...base, grades: [3, 4], majors: ["과학", "IT"], enrollment: ["재학"] },
    eligibilityText: "3~4학년 이공계(과학·IT) 재학생.",
  },
  {
    id: "a6", title: "부산 청년 문화기획단", org: "부산광역시", category: "대외활동", track: "activity",
    source: "온통청년", url: "https://youthcenter.go.kr/6", deadline: "2026-08-10", postedAt: "2026-07-13", parseStatus: "curated",
    eligibility: { ...base, regions: ["부산"] },
    eligibilityText: "부산 거주 청년.",
  },
  {
    id: "a7", title: "이공계 국가우수장학금", org: "한국장학재단", category: "장학", track: "scholarship",
    source: "장학재단", url: "https://kosaf.go.kr/7", deadline: "2026-07-24", postedAt: "2026-07-05", parseStatus: "curated",
    eligibility: { ...base, grades: [1, 2], majors: ["과학", "IT", "의학"], incomeMax: 8, gpaMin: 3.5 },
    eligibilityText: "1~2학년 이공계, 소득 8분위 이하, 직전 학기 3.5 이상.",
  },
  {
    id: "a8", title: "성적우수 재학생 장학금", org: "◎◎재단", category: "장학", track: "scholarship",
    source: "장학재단", url: "https://example.org/8", deadline: "2026-08-01", postedAt: "2026-07-10", parseStatus: "needs_review",
    eligibility: { ...base, gpaMin: 4.0 },
    eligibilityText: "직전 학기 평점 기준이 첨부 이미지에만 있어 원문 확인이 필요함.",
  },
  {
    id: "a9", title: "브랜드 마케팅 아이디어 공모전", org: "☆☆기업", category: "공모전", track: "activity",
    source: "콘테스트코리아", url: "https://contestkorea.com/9", deadline: "2026-08-03", postedAt: "2026-07-12", parseStatus: "curated",
    eligibility: { ...base, majors: ["경영"] },
    eligibilityText: "경영·마케팅 계열 대상.",
  },
  {
    id: "a10", title: "신입생 서포터즈", org: "△△대학교", category: "대외활동", track: "activity",
    source: "링커리어", url: "https://linkareer.com/activity/10", deadline: "2026-07-26", postedAt: "2026-07-07", parseStatus: "curated",
    eligibility: { ...base, grades: [1] },
    eligibilityText: "1학년 신입생 대상.",
  },
  {
    id: "a11", title: "지역인재 육성 장학", org: "지방장학재단", category: "장학", track: "scholarship",
    source: "온통청년", url: "https://youthcenter.go.kr/11", deadline: "2026-07-29", postedAt: "2026-07-11", parseStatus: "curated",
    eligibility: { ...base, regions: ["강원", "충청", "전라", "경상"], enrollment: ["재학"] },
    eligibilityText: "비수도권 소재 대학 재학생.",
  },
  {
    id: "a12", title: "저소득 예술계열 장학", org: "예술위원회", category: "장학", track: "scholarship",
    source: "장학재단", url: "https://example.org/12", deadline: "2026-08-02", postedAt: "2026-07-06", parseStatus: "curated",
    eligibility: { ...base, majors: ["예술"], regions: ["부산"], incomeMax: 4 },
    eligibilityText: "부산 소재 예술계열, 소득 4분위 이하.",
  },
  {
    id: "a13", title: "대학원 진학 연구지원", org: "연구재단", category: "장학", track: "scholarship",
    source: "장학재단", url: "https://example.org/13", deadline: "2026-08-08", postedAt: "2026-07-13", parseStatus: "curated",
    eligibility: { ...base, enrollment: ["졸업예정"], majors: ["의학"] },
    eligibilityText: "졸업예정 의학계열.",
  },
  {
    id: "a14", title: "마감 지난 공모전 예시", org: "XX", category: "공모전", track: "activity",
    source: "콘테스트코리아", url: "https://contestkorea.com/14", deadline: "2026-07-05", postedAt: "2026-06-30", parseStatus: "curated",
    eligibility: { ...base },
    eligibilityText: "이미 마감된 공고(목록에서 자동으로 빠져야 함).",
  },
];
