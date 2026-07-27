import { describe, expect, it } from 'vitest'
import { inferTrackTopics } from './trackTopicKeywords.mjs'

describe('inferTrackTopics', () => {
  it('maps a frontend-flavored goal to the react topic', () => {
    expect(inferTrackTopics('React state와 이벤트 이해하기')).toEqual(['react'])
  })

  it('maps a backend-flavored goal to the backend topic', () => {
    expect(inferTrackTopics('FastAPI로 백엔드 API 서버 만들기')).toEqual(['backend'])
  })

  it('maps a fullstack-flavored goal to both react and backend topics', () => {
    expect(inferTrackTopics('풀스택 개발자가 되고 싶어요')).toEqual(['react', 'backend'])
  })

  it('maps a devops-flavored goal to the docker topic', () => {
    expect(inferTrackTopics('Docker와 인프라 배포 배우기')).toEqual(['docker'])
  })

  it('maps a CS-flavored goal to the software-engineer topic', () => {
    expect(inferTrackTopics('자료구조와 알고리즘 기초 다지기')).toEqual(['software-engineer'])
  })

  it('returns an empty array when no keyword matches', () => {
    expect(inferTrackTopics('오늘 기분이 좋다')).toEqual([])
  })
})
