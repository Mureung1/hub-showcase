/*
 * 스크립트가 어느 DB를 건드리는지 실행 직전에 알린다.
 *
 * seed 계열은 TRUNCATE/DELETE를 포함한다. 로컬을 지우려다 배포 DB를 지우는 사고를
 * 막으려면 "지금 어디에 붙어 있는가"가 눈에 보여야 한다.
 * (server/.env의 DATABASE_URL을 주석으로 토글해 쓰기 때문에 특히 헷갈리기 쉽다.)
 */
export function describeTarget() {
  const raw = process.env.DATABASE_URL
  if (!raw) return { host: '(DATABASE_URL 없음)', isLocal: false }

  try {
    const u = new URL(raw)
    const isLocal = u.hostname === 'localhost' || u.hostname === '127.0.0.1'
    return { host: `${u.hostname}:${u.port}`, isLocal }
  } catch {
    return { host: '(파싱 실패)', isLocal: false }
  }
}

export function printTarget() {
  const { host, isLocal } = describeTarget()
  const label = isLocal ? '로컬' : '배포(원격)'
  console.log(`대상 DB: ${host}  [${label}]`)
  if (!isLocal) {
    console.log('주의: 원격 DB입니다. 시연용 데이터를 덮어씁니다.')
  }
}
