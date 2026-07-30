// 보안 헤더가 두 배포 경로에서 갈라지지 않게 잠근다.
//
// Vercel은 화면(정적 파일)을 CDN이 직접 내보내므로 server/proxy.js의 미들웨어를 거치지 않는다.
// 즉 같은 헤더를 vercel.json에도 적어야 하는데, 두 파일이 멀리 떨어져 있어 한쪽만 고쳐도
// 눈으로는 안 잡히고 **그 배포만 조용히 무방비가 된다**. 사람이 기억할 일이 아니라 여기서 대조한다.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { SECURITY_HEADERS } from './securityHeaders.js'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const vercelConfig = JSON.parse(readFileSync(path.join(repoRoot, 'vercel.json'), 'utf8'))

describe('보안 헤더', () => {
  it('vercel.json이 모든 경로에 헤더를 붙인다', () => {
    const rules = vercelConfig.headers ?? []
    expect(rules.some((r) => r.source === '/(.*)')).toBe(true)
  })

  it('vercel.json의 헤더가 Express 미들웨어와 값까지 동일하다', () => {
    const rule = (vercelConfig.headers ?? []).find((r) => r.source === '/(.*)')
    const fromVercel = Object.fromEntries((rule?.headers ?? []).map((h) => [h.key, h.value]))
    expect(fromVercel).toEqual(SECURITY_HEADERS)
  })

  it('클릭재킹 방어가 두 방식으로 다 걸려 있다', () => {
    // X-Frame-Options는 구형 브라우저·웹뷰용, CSP frame-ancestors는 현행 표준.
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('SAMEORIGIN')
    expect(SECURITY_HEADERS['Content-Security-Policy']).toContain('frame-ancestors')
  })

  it('CSP에 frame-ancestors 외의 지시자를 넣지 않는다', () => {
    // script-src/style-src를 좁히면 네이버 지도 SDK와 인라인 스타일이 죽고, 서버 URL 방식이라
    // 배포되는 순간 설치된 APK까지 흰 화면이 된다. 늘리려면 실기기 확인이 선행돼야 한다.
    const directives = SECURITY_HEADERS['Content-Security-Policy']
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean)
    expect(directives).toEqual(["frame-ancestors 'self'"])
  })

  it('vercel.json 헤더 규칙에 Vercel 스키마 밖의 키가 없다', () => {
    // comment 같은 임의 키를 넣으면 배포 시 스키마 검증에서 떨어진다(실제로 넣을 뻔했다).
    const allowed = new Set(['source', 'headers', 'has', 'missing'])
    for (const rule of vercelConfig.headers ?? []) {
      expect(Object.keys(rule).filter((k) => !allowed.has(k))).toEqual([])
    }
  })
})
