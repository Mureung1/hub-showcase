import { fetchDeployedBuildId, getRunningBuildId, isUpdateAvailable, parseBuildId } from './appUpdate.js'

// 실제 vite 산출물 모양(dist/index.html)
const REAL_INDEX = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <script type="module" crossorigin src="/assets/index-bOn1jmQO.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-CD_GR2KH.css">
  </head>
  <body><div id="root"></div></body>
</html>`

describe('parseBuildId', () => {
  it('진입 번들 경로를 뽑는다', () => {
    expect(parseBuildId(REAL_INDEX)).toBe('/assets/index-bOn1jmQO.js')
  })

  it('CSS 링크가 먼저 나와도 JS 번들을 고른다', () => {
    // 둘 다 /assets/ 아래에 해시가 붙어 있다. 실행 중인 번들과 비교할 수 있는 건 script 쪽뿐이라,
    // 순서가 바뀌어도 CSS를 집으면 안 된다(vite 출력 순서는 보장된 계약이 아니다).
    const cssFirst = `<head>
      <link rel="stylesheet" crossorigin href="/assets/index-CD_GR2KH.css">
      <script type="module" crossorigin src="/assets/index-bOn1jmQO.js"></script>
    </head>`
    expect(parseBuildId(cssFirst)).toBe('/assets/index-bOn1jmQO.js')
  })

  it('찾을 수 없으면 null', () => {
    expect(parseBuildId('<html><body>oops</body></html>')).toBeNull()
    expect(parseBuildId('')).toBeNull()
    expect(parseBuildId(null)).toBeNull()
    // 프록시나 캡티브 포털이 HTML 대신 다른 걸 돌려주는 경우
    expect(parseBuildId('{"error":"nope"}')).toBeNull()
  })
})

describe('getRunningBuildId', () => {
  const docWith = (html) => {
    const d = document.implementation.createHTMLDocument('t')
    d.head.innerHTML = html
    return d
  }

  it('절대 URL로 렌더돼도 경로만 돌려준다', () => {
    const d = docWith('<script type="module" src="https://hub-iota-seven.vercel.app/assets/index-abc123.js"></script>')
    expect(getRunningBuildId(d)).toBe('/assets/index-abc123.js')
  })

  it('상대 경로도 같은 모양으로 맞춘다 — parseBuildId 결과와 직접 비교돼야 한다', () => {
    const d = docWith('<script type="module" src="/assets/index-abc123.js"></script>')
    expect(getRunningBuildId(d)).toBe('/assets/index-abc123.js')
  })

  it('script가 없으면 null', () => {
    expect(getRunningBuildId(docWith(''))).toBeNull()
    expect(getRunningBuildId(null)).toBeNull()
  })
})

describe('isUpdateAvailable', () => {
  it('번들 경로가 다르면 새 배포', () => {
    expect(isUpdateAvailable('/assets/index-aaa.js', '/assets/index-bbb.js')).toBe(true)
  })

  it('같으면 최신', () => {
    expect(isUpdateAvailable('/assets/index-aaa.js', '/assets/index-aaa.js')).toBe(false)
  })

  it('한쪽이라도 모르면 알리지 않는다', () => {
    // 근거 없이 알리면 눌러도 아무것도 안 바뀌는 새로고침을 반복하게 된다.
    expect(isUpdateAvailable(null, '/assets/index-bbb.js')).toBe(false)
    expect(isUpdateAvailable('/assets/index-aaa.js', null)).toBe(false)
    expect(isUpdateAvailable(null, null)).toBe(false)
  })
})

describe('fetchDeployedBuildId', () => {
  it('캐시를 우회해서 받아온다', async () => {
    // 이 확인 자체가 캐시된 옛 index.html을 받으면 존재 이유가 없어진다.
    const calls = []
    const fetchImpl = async (url, init) => {
      calls.push({ url, init })
      return { ok: true, text: async () => REAL_INDEX }
    }
    expect(await fetchDeployedBuildId({ fetchImpl })).toBe('/assets/index-bOn1jmQO.js')
    expect(calls[0].url).toBe('/index.html')
    expect(calls[0].init.cache).toBe('no-store')
  })

  it('네트워크 실패는 null — 오프라인을 새 배포로 오인하지 않는다', async () => {
    const boom = async () => {
      throw new Error('offline')
    }
    expect(await fetchDeployedBuildId({ fetchImpl: boom })).toBeNull()
  })

  it('4xx/5xx도 null', async () => {
    const fetchImpl = async () => ({ ok: false, status: 503, text: async () => 'nope' })
    expect(await fetchDeployedBuildId({ fetchImpl })).toBeNull()
  })
})
