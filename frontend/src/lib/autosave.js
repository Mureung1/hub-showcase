// 초안 자동저장 판정 로직. 화면·DB와 분리된 순수 함수라 테스트로 먼저 명세를 고정했다
// (autosave.test.js 참고). EditorPage는 이 판정 결과에 따라 기존 saveDraft를 호출하기만 한다.

// 변경 감지에 쓸 필드만 뽑아 문자열로 만든다.
// guideKey처럼 화면 표시용이라 저장 내용과 무관한 필드는 일부러 제외한다 —
// 안 그러면 내용이 그대로인데도 저장이 계속 돈다.
export function makeSnapshot({ title, gameTag, systemTag, category, feedbackWanted, sections }) {
  return JSON.stringify({
    title,
    gameTag,
    systemTag,
    category,
    feedbackWanted,
    sections: (sections ?? []).map((s) => ({
      id: s.id,
      heading: s.heading,
      content: s.content,
      // 구조화 섹션은 필드 값의 변화도 저장 트리거가 되어야 한다.
      fields: (s.fields ?? []).map((f) => ({ key: f.key, value: f.value })),
    })),
  })
}

// lastSaved가 null이면 아직 한 번도 저장한 적 없으므로 변경으로 본다.
export function hasUnsavedChanges(snapshot, lastSaved) {
  return snapshot !== lastSaved
}

// 제목도 섹션 본문도 비어 있으면 저장할 게 없는 문서다.
// (템플릿만 열어둔 상태로 빈 초안이 DB에 쌓이는 것을 막는다)
export function isEmptyDraft({ title, sections }) {
  const hasTitle = (title ?? '').trim() !== ''
  const hasBody = (sections ?? []).some(
    (s) =>
      (s.content ?? '').trim() !== '' ||
      (s.fields ?? []).some((f) => (f.value ?? '').trim() !== ''),
  )
  return !hasTitle && !hasBody
}

export function shouldAutosave({ hasChanges, isEmpty, isSaving }) {
  return hasChanges && !isEmpty && !isSaving
}
