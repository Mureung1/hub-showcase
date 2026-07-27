// 미충족 항목을 보완할 수 있는 외부 사이트 고정 링크 (#25). 판정 로직에는 관여하지 않는 순수 표시용 데이터.
const FOREIGN_LANG_LINKS = {
  TOEIC: 'https://exam.ybmnet.co.kr/toeic/',
  'TOEIC Speaking': 'https://www.toeicswt.co.kr/',
  TOEFL: 'https://www.kr.ets.org/toefl.html',
  OPIc: 'https://www.opic.or.kr/',
}

const CAREER_REFERENCE_LINK = 'https://www.saramin.co.kr/'
const CERTIFICATE_REFERENCE_LINK = 'https://www.q-net.or.kr/'
// 학점은행제(국가평생교육진흥원) — 학력을 실제로 올릴 수 있는 공식 제도. 학위 취득에 학기 단위 기간이
// 걸리므로 경력/자격증(짧은 준비 기간)과 달리 JobDetailModal에서 별도 안내 캡션을 붙인다.
const EDUCATION_REFERENCE_LINK = 'https://www.cb.or.kr/'

// 어학은 시험 종류별로 링크가 다르고, 경력/자격증/학력은 항목 자체가 고정 링크라 requirementValue를 보지 않는다.
export function getReferenceLink(category, requirementValue) {
  if (category === 'foreignLanguage') return FOREIGN_LANG_LINKS[requirementValue]
  if (category === 'career') return CAREER_REFERENCE_LINK
  if (category === 'certificates') return CERTIFICATE_REFERENCE_LINK
  if (category === 'education') return EDUCATION_REFERENCE_LINK
  return undefined
}

const REFERENCE_CAPTIONS = {
  certificates: '정확한 시행기관은 자격증마다 다를 수 있어요.',
  education: '학위 취득에는 보통 학기 단위의 기간이 걸려요.',
}

export function getReferenceCaption(category) {
  return REFERENCE_CAPTIONS[category]
}

// job.checklist(buildJobDisplay가 만든 배열)에서 미충족이면서 참고링크가 있는 항목만 뽑아준다.
// JobDetailModal의 항목별 인라인 링크와, 북마크 페이지의 "필요 사이트 모아보기" 팝업이 이 로직을 공유한다.
export function collectJobReferenceLinks(checklist) {
  if (!checklist) return []
  return checklist
    .filter((c) => !c.ok)
    .map((c) => ({
      category: c.category,
      label: c.label,
      link: getReferenceLink(c.category, c.requirementValue),
      caption: getReferenceCaption(c.category),
    }))
    .filter((entry) => entry.link)
}
