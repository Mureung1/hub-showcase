import { describe, it, expect } from 'vitest'
import { toDbRow, toApiDoc } from './documents-mapper.js'

// 섹션은 구조화(fields)와 레거시(content) 두 형태를 왕복해도 보존돼야 한다.
// 하위호환이 깨지면 기존 예시 35편·시드 5편이 상세에서 빈 화면이 된다.
describe('섹션 형태 왕복 (fields ↔ content)', () => {
  it('구조화 섹션(fields)이 DB→API 왕복에서 보존된다', () => {
    const row = toDbRow({
      title: '원페이지 피치',
      sections: [
        {
          id: 's1',
          guideKey: 'identity',
          heading: '정체성',
          fields: [{ key: 'pitch', label: '한 줄 소개', value: '로그라이크 덱빌더' }],
        },
      ],
    })
    expect(row.sections[0].fields[0].value).toBe('로그라이크 덱빌더')
    expect(row.sections[0]).not.toHaveProperty('content')

    const api = toApiDoc({ ...row, id: 'x', status: 'published' })
    expect(api.sections[0].fields[0].label).toBe('한 줄 소개')
    expect(api.sections[0].guideKey).toBe('identity')
  })

  it('ai_score는 읽기(API)로만 나오고, 클라 쓰기(toDbRow)는 무시된다', () => {
    // 읽기: 컬럼 → aiScore
    const api = toApiDoc({ id: 'x', status: 'published', ai_score: 88, sections: [] })
    expect(api.aiScore).toBe(88)

    // 쓰기: 클라가 aiScore를 보내도 DB 로우에 실리지 않는다(점수 위조 차단)
    const row = toDbRow({ title: '조작 시도', aiScore: 999 })
    expect(row).not.toHaveProperty('ai_score')
  })

  it('레거시 섹션(content)은 그대로 보존된다(하위호환)', () => {
    const row = toDbRow({
      sections: [{ id: 's1', heading: '개요', content: '긴 문단' }],
    })
    expect(row.sections[0].content).toBe('긴 문단')
    expect(row.sections[0]).not.toHaveProperty('fields')

    const api = toApiDoc({ ...row, id: 'x', status: 'published' })
    expect(api.sections[0].content).toBe('긴 문단')
  })
})
