import type { ContentType, MissionType, UrlStatus } from '../../api/types'

export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  article: '아티클',
  blog: '블로그',
  video: '영상',
}

export const MISSION_TYPE_LABEL: Record<MissionType, string> = {
  question: '질문',
  rebuttal: '반박',
  connection: '연결',
  expression: '표현',
}

export const MISSION_TYPE_ORDER: MissionType[] = [
  'question',
  'rebuttal',
  'connection',
  'expression',
]

export const URL_STATUS_NOTICE: Record<Exclude<UrlStatus, 'active'>, string> = {
  paywalled: '유료 콘텐츠라 이 앱에서 바로 열 수 없어요.',
  broken: '원문 링크에 문제가 생겼어요.',
  removed: '원문이 삭제됐어요.',
}
