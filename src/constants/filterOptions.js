// server/data/jobs_data.csv에 실제 등장하는 job_category 9종 (2026-07-15 집계).
// 프로토타입(demo_11.html)의 FILTER_OPTIONS(jobTypes/regions/employmentTypes)는 목업 데이터라 쓰지 않는다 —
// checklist.md 확정 사항: 지역/급여 필터 없음, 필터는 job_category/is_intern 두 가지뿐.

export const JOB_CATEGORY_OPTIONS = [
  'IT전산',
  '공무기능',
  '교육교원',
  '기술설비',
  '기타',
  '사무행정',
  '상담복지',
  '연구전문',
  '의료보건',
]
