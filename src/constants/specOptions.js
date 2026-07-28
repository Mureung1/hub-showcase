// server/data/jobs_data.csv에 실제 등장하는 값 기준 (2026-07-14 집계). 프로토타입(demo_11.html)의
// EDUCATION_OPTIONS/MAJOR_OPTIONS/CERT_OPTIONS는 IT 직군 위주의 자체 목업이라 그대로 쓰지 않는다.

export const EDUCATION_OPTIONS = ['학력무관', '고졸', '전문학사', '학사', '석사', '박사']

export const MAJOR_OPTIONS = [
  '전공무관',
  '관련 전공(공고별 상이)',
  '해당 교과 전공',
  '간호학과',
  '물리치료학과',
  '임상병리학과',
  '보건행정학과',
  '약학과',
  '전기공학과',
  '기계공학과',
  '건축공학과',
  '토목공학과',
  '정보통신공학과',
  '소프트웨어학과',
  '행정학과',
  '경영학과',
  '회계학과',
  '심리학과',
  '아동학과',
  '사회복지학과',
]

// 부전공 선택지 — MAJOR_OPTIONS 앞 3개(전공무관 계열 placeholder)는 "부전공 없음"과 의미가 겹쳐 제외한다.
export const MINOR_MAJOR_OPTIONS = MAJOR_OPTIONS.slice(3)

export const CERT_OPTIONS = [
  '간호사',
  '물리치료사',
  '방사선사',
  '임상병리사',
  '약사',
  '응급구조사',
  '요양보호사',
  '사회복지사 1급',
  '사회복지사 2급',
  '청소년상담사',
  '장애인재활상담사',
  '전기기사',
  '기계정비산업기사',
  '건축기사',
  '토목기사',
  '산업안전기사',
  '정보통신기사',
  '정보처리기사',
  'SQLD',
  '전산회계',
  '컴퓨터활용능력 1급',
  '컴퓨터활용능력 2급',
  'MOS',
  '교원자격증',
  '조리사',
  '지게차운전기능사',
  '운전면허 1종',
]

export const FOREIGN_LANG_TEST_OPTIONS = ['TOEIC', 'TOEIC Speaking', 'TOEFL', 'OPIc']

// OPIc은 숫자 점수가 아니라 등급(낮음→높음) — 서버(gapAnalysisService.js)의 OPIC_RANK와 값이 같아야 한다.
export const OPIC_GRADE_OPTIONS = ['NL', 'NM', 'NH', 'IL', 'IM1', 'IM2', 'IM3', 'IH', 'AL']
