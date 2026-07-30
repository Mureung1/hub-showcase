// 내 학교의 지도 좌표 — NEIS에는 좌표가 없어서 학교 이름으로 지오코딩해 얻는다.
//
// NEIS 학교기본정보(searchSchools)가 주는 건 {name, officeCode, schoolCode, kind}뿐이고 위경도는
// 없다. 그래서 지도 탭이 "우리 학교 위치"를 보여주려면 이름을 좌표로 바꾸는 단계가 하나 필요하다.
//
// 학교 위치는 바뀌지 않으므로 **기기에 영구 캐시**한다(학교를 한 번 고르면 그 뒤로는 네트워크 0).
// 계정이 아니라 기기에 두는 이유는 cardSettings.js와 같다 — 화면 표시를 위한 파생 데이터지 사용자
// 데이터가 아니고, 서버에 올려봐야 계정을 옮겨도 다시 지오코딩하면 그만이다.
import { geocodeLocation } from './kakao.js'
import { get, set } from './storage.js'

const CACHE_KEY = 'schoolLocations'

// 지오코딩은 "양서고"보다 "양서고등학교"처럼 정식 명칭에서 훨씬 잘 맞는다. NEIS가 주는 name이 이미
// 정식 명칭이라 그대로 쓰되, 같은 이름의 학교가 여러 지역에 있는 경우가 흔해서(중앙초등학교 등)
// 교육청 이름을 앞에 붙여 지역을 좁힌다.
function buildQuery(school) {
  const office = typeof school.officeName === 'string' ? school.officeName.replace(/교육청$/, '').trim() : ''
  return office ? `${office} ${school.name}` : school.name
}

function readCache() {
  const cached = get(CACHE_KEY)
  return cached && typeof cached === 'object' ? cached : {}
}

// 실패는 **기기에 영구 저장하지 않는다.** 예전엔 `{ failed: true }`를 localStorage에 남겨서, 네트워크가
// 잠깐 끊겼거나 지오코딩이 한 번 흔들린 것만으로 그 학교 핀이 기기에서 영영 안 뜨게 됐다(재시도할
// 방법이 없었다). 성공만 영구 캐시하고(학교 위치는 안 바뀐다) 실패는 메모리에 짧게만 기억한다 —
// 탭을 들락거릴 때 연타로 지오코딩을 두드리는 것만 막으면 충분하다.
const failures = new Map() // schoolCode -> 실패 시각(ms)
const FAILURE_TTL_MS = 5 * 60 * 1000

export function _clearSchoolLocationCacheForTest() {
  set(CACHE_KEY, {})
  failures.clear()
}

// school: profile.school ({ name, code, officeCode, officeName?, kind }) | null
// 반환: { lat, lng } | null — 못 찾으면 null(지도는 학교 핀 없이 그대로 동작한다).
export async function getSchoolLocation(school) {
  if (!school?.name || !school?.code) return null

  const cache = readCache()
  const hit = cache[school.code]
  // 예전 버전이 남긴 `{ failed: true }` 기록은 무시하고 다시 시도한다(그 값 때문에 핀이 영영 안 뜨는
  // 기기가 있을 수 있다).
  if (hit && !hit.failed) return { lat: hit.lat, lng: hit.lng }

  const failedAt = failures.get(school.code)
  if (failedAt !== undefined) {
    if (Date.now() - failedAt < FAILURE_TTL_MS) return null
    failures.delete(school.code)
  }

  try {
    const { x, y } = await geocodeLocation(buildQuery(school))
    const lat = Number(y)
    const lng = Number(x)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('좌표 형식 오류')
    set(CACHE_KEY, { ...cache, [school.code]: { lat, lng } })
    return { lat, lng }
  } catch {
    failures.set(school.code, Date.now())
    return null
  }
}
