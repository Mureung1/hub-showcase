// jobs_data.csv에 실제 등장하는 9개 job_category 값 기준 배지 색상/약칭.
// 프로토타입(demo_11.html)의 JOBTYPE_STYLE은 IT 위주 5개 자체 목업 직종이라 그대로 쓰지 않는다.
export const JOB_CATEGORY_STYLE = {
  IT전산: { bg: '#1d3a6e', text: '#8ab4ff', letter: 'IT' },
  사무행정: { bg: '#3a2f1d', text: '#e0b878', letter: '사무' },
  의료보건: { bg: '#1d3a2f', text: '#7fd9a8', letter: '의료' },
  기술설비: { bg: '#3a1d2f', text: '#d97fa8', letter: '기술' },
  연구전문: { bg: '#2a1d3a', text: '#b28ae0', letter: '연구' },
  상담복지: { bg: '#1d333a', text: '#7fc4d9', letter: '상담' },
  교육교원: { bg: '#3a331d', text: '#d9c47f', letter: '교육' },
  공무기능: { bg: '#2a2a2a', text: '#bbbbbb', letter: '공무' },
  기타: { bg: '#2a2a2a', text: '#999999', letter: '기타' },
}

export const DEFAULT_CATEGORY_STYLE = { bg: '#2a2a2a', text: '#999999', letter: '?' }

// pickPrimaryStatus가 반환하는 key(match / missing_education / missing_career / ...) 기준 색상.
export const STATUS_STYLE = {
  match: { bg: '#1d3a2f', text: '#7fd9a8' },
  missing_education: { bg: '#3a2f1d', text: '#e0b878' },
  missing_career: { bg: '#3a1d1d', text: '#e08a8a' },
  missing_certificates: { bg: '#3a2f1d', text: '#e0b878' },
  missing_major: { bg: '#2a1d3a', text: '#b28ae0' },
  missing_foreignLanguage: { bg: '#1d333a', text: '#7fc4d9' },
}
