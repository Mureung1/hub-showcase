import { describe, it, expect } from 'vitest'
import { makeSnapshot, hasUnsavedChanges, shouldAutosave } from './autosave.js'

// 에디터 폼 상태의 최소 형태
const form = (over = {}) => ({
  title: '스타포스 역기획',
  gameTag: '메이플스토리',
  systemTag: '강화 시스템',
  feedbackWanted: false,
  sections: [{ id: 's1', heading: '개요', content: '파괴는 매몰비용을 만든다' }],
  ...over,
})

describe('makeSnapshot', () => {
  it('같은 내용이면 같은 스냅샷을 만든다', () => {
    expect(makeSnapshot(form())).toBe(makeSnapshot(form()))
  })

  it('제목이 바뀌면 스냅샷이 달라진다', () => {
    expect(makeSnapshot(form())).not.toBe(makeSnapshot(form({ title: '다른 제목' })))
  })

  it('섹션 본문이 바뀌면 스냅샷이 달라진다', () => {
    const changed = form({ sections: [{ id: 's1', heading: '개요', content: '수정됨' }] })

    expect(makeSnapshot(form())).not.toBe(makeSnapshot(changed))
  })

  it('섹션 제목이 바뀌어도 스냅샷이 달라진다', () => {
    const changed = form({
      sections: [{ id: 's1', heading: '요약', content: '파괴는 매몰비용을 만든다' }],
    })

    expect(makeSnapshot(form())).not.toBe(makeSnapshot(changed))
  })

  it('피드백 요청 토글도 변경으로 잡는다', () => {
    expect(makeSnapshot(form())).not.toBe(makeSnapshot(form({ feedbackWanted: true })))
  })

  it('가이드키 같은 표시용 필드는 스냅샷에 영향을 주지 않는다', () => {
    const withGuide = form({
      sections: [
        { id: 's1', heading: '개요', content: '파괴는 매몰비용을 만든다', guideKey: 'overview' },
      ],
    })

    expect(makeSnapshot(withGuide)).toBe(makeSnapshot(form()))
  })
})

describe('구조화 필드(fields) 섹션', () => {
  const fieldForm = (value) =>
    form({
      sections: [
        {
          id: 's1',
          heading: '정체성',
          fields: [{ key: 'pitch', label: '한 줄 소개', value }],
        },
      ],
    })

  it('필드 값이 바뀌면 스냅샷이 달라진다', () => {
    expect(makeSnapshot(fieldForm('로그라이크 덱빌더'))).not.toBe(
      makeSnapshot(fieldForm('플랫포머')),
    )
  })

  it('필드 라벨은 스냅샷에 영향을 주지 않는다(값만 본다)', () => {
    const a = fieldForm('같은 값')
    const b = fieldForm('같은 값')
    b.sections[0].fields[0].label = '라벨만 다름'
    expect(makeSnapshot(a)).toBe(makeSnapshot(b))
  })

  it('isEmptyDraft: 제목·필드가 모두 비면 빈 문서', async () => {
    const { isEmptyDraft } = await import('./autosave.js')
    expect(isEmptyDraft({ ...fieldForm('   '), title: '  ' })).toBe(true)
  })

  it('isEmptyDraft: 필드 하나라도 채워지면 빈 문서 아님', async () => {
    const { isEmptyDraft } = await import('./autosave.js')
    expect(isEmptyDraft({ ...fieldForm('한 줄 소개 채움'), title: '' })).toBe(false)
  })
})

describe('hasUnsavedChanges', () => {
  it('마지막 저장 스냅샷과 다르면 true', () => {
    expect(hasUnsavedChanges(makeSnapshot(form({ title: '바뀜' })), makeSnapshot(form()))).toBe(
      true,
    )
  })

  it('마지막 저장 스냅샷과 같으면 false', () => {
    expect(hasUnsavedChanges(makeSnapshot(form()), makeSnapshot(form()))).toBe(false)
  })

  it('한 번도 저장한 적 없으면(null) 변경으로 본다', () => {
    expect(hasUnsavedChanges(makeSnapshot(form()), null)).toBe(true)
  })
})

describe('shouldAutosave', () => {
  it('변경이 있고 내용이 있고 저장 중이 아니면 저장한다', () => {
    expect(shouldAutosave({ hasChanges: true, isEmpty: false, isSaving: false })).toBe(true)
  })

  it('변경이 없으면 저장하지 않는다', () => {
    expect(shouldAutosave({ hasChanges: false, isEmpty: false, isSaving: false })).toBe(false)
  })

  it('빈 문서는 저장하지 않는다 — 템플릿만 연 상태로 빈 초안이 쌓이면 안 된다', () => {
    expect(shouldAutosave({ hasChanges: true, isEmpty: true, isSaving: false })).toBe(false)
  })

  it('이미 저장 중이면 중복 저장하지 않는다', () => {
    expect(shouldAutosave({ hasChanges: true, isEmpty: false, isSaving: true })).toBe(false)
  })
})

describe('isEmptyDraft', () => {
  it('제목도 섹션 내용도 비어 있으면 빈 문서다', async () => {
    const { isEmptyDraft } = await import('./autosave.js')

    expect(
      isEmptyDraft(form({ title: '   ', sections: [{ id: 's1', heading: '개요', content: '' }] })),
    ).toBe(true)
  })

  it('제목만 있어도 빈 문서가 아니다', async () => {
    const { isEmptyDraft } = await import('./autosave.js')

    expect(
      isEmptyDraft(
        form({ title: '스타포스', sections: [{ id: 's1', heading: '개요', content: '' }] }),
      ),
    ).toBe(false)
  })

  it('섹션 본문만 있어도 빈 문서가 아니다', async () => {
    const { isEmptyDraft } = await import('./autosave.js')

    expect(
      isEmptyDraft(form({ title: '', sections: [{ id: 's1', heading: '개요', content: '내용' }] })),
    ).toBe(false)
  })
})
