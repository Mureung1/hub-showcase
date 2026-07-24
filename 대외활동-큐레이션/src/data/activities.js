// 대외활동/공모전/장학 스키마 + 여러 화면이 공유하는 옵션 상수
//
// eligibility(자격요건)는 "이 조건들을 모두 만족해야 지원 가능"을 뜻한다.
// 빈 배열([]) 또는 null 은 "무관(누구나 가능)"으로 해석한다.
// parseStatus 가 "needs_review" 면 원문을 제대로 못 읽은 것이라 판정 없이 "확인 필요"로 보낸다.
//
// @typedef Activity
// @property {string} id
// @property {string} title
// @property {string} org
// @property {'대외활동'|'공모전'|'장학'|'지자체'} category
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
// @property {number|null} eligibility.incomeMax 소득분위 상한(이하), null = 무관
// @property {number|null} eligibility.gpaMin   최소 학점(이상), null = 무관
// @property {string} eligibilityText           원문 자격요건 문장 (판정 근거)

export const MAJORS = ["인문", "경영", "경제", "교육", "과학", "IT", "의학", "예술"];
export const REGIONS = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "강원", "충청", "전라", "경상", "제주"];
export const ENROLLMENTS = ["재학", "휴학", "졸업예정"];
