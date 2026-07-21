// jobs_data.csv에 실제 등장하는 9개 job_category 값 기준 배지 색상/약칭.
// 프로토타입(demo_13.html)의 JOBTYPE_STYLE은 IT 위주 5개 자체 목업 직종이라 그대로 쓰지 않지만,
// 색상 값 자체는 프로토타입과 동일한 CSS 변수(--green-bg 등)를 문자열로 참조한다 — 하드코딩 hex를 쓰면
// :root[data-theme="dark"]에서 색이 안 바뀐다 (#22). 5개 토큰 색상을 9개 카테고리에 재사용해서 배분한다.
export const JOB_CATEGORY_STYLE = {
  IT전산: { bg: 'var(--blue-bg)', text: 'var(--blue-text)', letter: 'IT' },
  사무행정: { bg: 'var(--orange-bg)', text: 'var(--orange-text)', letter: '사무' },
  의료보건: { bg: 'var(--green-bg)', text: 'var(--green-text)', letter: '의료' },
  기술설비: { bg: 'var(--red-bg)', text: 'var(--red-text)', letter: '기술' },
  연구전문: { bg: 'var(--purple-bg)', text: 'var(--purple-text)', letter: '연구' },
  상담복지: { bg: 'var(--blue-bg)', text: 'var(--blue-text)', letter: '상담' },
  교육교원: { bg: 'var(--orange-bg)', text: 'var(--orange-text)', letter: '교육' },
  공무기능: { bg: 'var(--gray-200)', text: 'var(--gray-700)', letter: '공무' },
  기타: { bg: 'var(--gray-200)', text: 'var(--gray-700)', letter: '기타' },
}

export const DEFAULT_CATEGORY_STYLE = { bg: 'var(--gray-200)', text: 'var(--gray-700)', letter: '?' }

// pickPrimaryStatus가 반환하는 key(match / missing_education / missing_career / ...) 기준 색상.
export const STATUS_STYLE = {
  match: { bg: 'var(--green-bg)', text: 'var(--green-text)' },
  missing_education: { bg: 'var(--orange-bg)', text: 'var(--orange-text)' },
  missing_career: { bg: 'var(--red-bg)', text: 'var(--red-text)' },
  missing_certificates: { bg: 'var(--orange-bg)', text: 'var(--orange-text)' },
  missing_major: { bg: 'var(--purple-bg)', text: 'var(--purple-text)' },
  missing_foreignLanguage: { bg: 'var(--blue-bg)', text: 'var(--blue-text)' },
}
