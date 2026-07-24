import { describe, expect, it } from 'vitest'
import {
  CONTENT_TYPE_LABEL,
  MISSION_TYPE_LABEL,
  MISSION_TYPE_ORDER,
  URL_STATUS_NOTICE,
} from './labels'

describe('domain labels', () => {
  it('API 도메인 값을 화면 라벨로 변환한다', () => {
    expect(CONTENT_TYPE_LABEL).toEqual({
      article: '아티클',
      blog: '블로그',
      video: '영상',
    })
    expect(MISSION_TYPE_LABEL).toEqual({
      question: '질문',
      rebuttal: '반박',
      connection: '연결',
      expression: '표현',
    })
    expect(MISSION_TYPE_ORDER).toEqual(['question', 'rebuttal', 'connection', 'expression'])
  })

  it('열 수 없는 원문의 상태별 안내 문구를 제공한다', () => {
    expect(URL_STATUS_NOTICE).toEqual({
      paywalled: '유료 콘텐츠라 이 앱에서 바로 열 수 없어요.',
      broken: '원문 링크에 문제가 생겼어요.',
      removed: '원문이 삭제됐어요.',
    })
  })
})
