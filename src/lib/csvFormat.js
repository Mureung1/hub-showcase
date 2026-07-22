// 최소 CSV 인코딩/디코딩 유틸(따옴표/쉼표/줄바꿈 이스케이프까지 처리). 외부 라이브러리 없이 이 정도
// 규모의 CSV는 충분히 안전하게 다룰 수 있다. csv.js(로그인 계정 레거시 백업)와 dataBackup.js(신체정보+식단 전체
// 기기 이관)가 공통으로 쓴다.

export function escapeField(value) {
  const str = value === null || value === undefined ? '' : String(value)
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

// rows: string[][], 헤더 행도 포함해서 넘긴다(이 함수는 어떤 게 헤더인지 모른다).
export function rowsToCsv(rows) {
  return rows.map((row) => row.map(escapeField).join(',')).join('\r\n')
}

// 따옴표로 감싼 필드 안의 쉼표/줄바꿈/이스케이프된 큰따옴표("")까지 처리하는 최소 CSV 파서.
export function parseCsv(text) {
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < withoutBom.length; i++) {
    const char = withoutBom[i]

    if (inQuotes) {
      if (char === '"' && withoutBom[i + 1] === '"') {
        field += '"'
        i += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      // RFC4180: 따옴표는 필드의 "맨 앞"에 올 때만 그 필드를 감싸는 열기 따옴표다. 이미 글자가 쌓인
      // 필드 중간의 따옴표는 그대로 리터럴 문자로 취급한다 — 이 체크가 없으면 손으로 편집한 파일에
      // 인치(") 표기 하나만 있어도 그 뒤 전체가 따옴표 모드로 빨려 들어가 파일 끝까지 망가진다.
      if (field === '') {
        inQuotes = true
      } else {
        field += char
      }
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && withoutBom[i + 1] === '\n') i += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((r) => r.length > 1 || r[0] !== '')
}
