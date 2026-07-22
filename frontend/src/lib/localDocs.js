// 비회원이 이 브라우저에서 쓴 문서의 목록.
// 비회원 문서는 계정에 묶이지 않아 URL을 잃으면 다시 찾을 수 없다.
// 그래서 저장·발행에 성공하면 여기에 id를 남겨 마이페이지에서 되찾을 수 있게 한다.
// (수정 권한은 여전히 서버의 수정용 비밀번호로만 확인한다 — 이건 "찾기" 용도일 뿐이다.)

const KEY = 'respec.localDocs'

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(docs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(docs))
  } catch {
    // 저장 실패(사생활 보호 모드 등)는 조용히 넘긴다 — 부가 기능이라 흐름을 막지 않는다.
  }
}

// 최근 수정 순으로 정렬해 반환.
export function getLocalDocs() {
  return read().sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
}

// 같은 id면 갱신, 없으면 추가.
export function rememberLocalDoc({ id, title, templateId, status }) {
  if (!id) return
  const docs = read().filter((d) => d.id !== id)
  docs.push({
    id,
    title: title || '(제목 없음)',
    templateId,
    status,
    updatedAt: new Date().toISOString(),
  })
  write(docs)
}

export function forgetLocalDoc(id) {
  write(read().filter((d) => d.id !== id))
}
