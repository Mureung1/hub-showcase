import { describe, it, expect, vi, beforeEach } from 'vitest'
import { _clearSchoolLocationCacheForTest, getSchoolLocation } from './schoolLocation.js'
import { geocodeLocation } from './kakao.js'

vi.mock('./kakao.js', () => ({ geocodeLocation: vi.fn() }))

const SCHOOL = { name: '양서고등학교', code: '7010084', officeCode: 'B10', officeName: '경기도교육청', kind: '고등학교' }

beforeEach(() => {
  _clearSchoolLocationCacheForTest()
  vi.mocked(geocodeLocation).mockReset()
})

describe('getSchoolLocation', () => {
  it('학교 이름을 좌표로 바꿔 돌려준다', async () => {
    vi.mocked(geocodeLocation).mockResolvedValue({ x: '127.3448', y: '36.3665' })
    expect(await getSchoolLocation(SCHOOL)).toEqual({ lat: 36.3665, lng: 127.3448 })
  })

  // 같은 이름의 학교가 여러 지역에 있는 경우가 흔하다(중앙초등학교 등) — 교육청으로 지역을 좁힌다.
  it('교육청 이름을 앞에 붙여 지역을 좁힌다', async () => {
    vi.mocked(geocodeLocation).mockResolvedValue({ x: '127', y: '36' })
    await getSchoolLocation(SCHOOL)
    expect(geocodeLocation).toHaveBeenCalledWith('경기도 양서고등학교')
  })

  // 학교 위치는 바뀌지 않는다 — 한 번 찾으면 그 뒤로는 네트워크가 0이어야 한다.
  it('학교 코드로 캐시해 두 번 조회하지 않는다', async () => {
    vi.mocked(geocodeLocation).mockResolvedValue({ x: '127', y: '36' })
    await getSchoolLocation(SCHOOL)
    await getSchoolLocation(SCHOOL)
    expect(geocodeLocation).toHaveBeenCalledTimes(1)
  })

  // 지오코딩이 안 되는 학교는 다시 시도해도 계속 실패한다 — 탭에 들어올 때마다 네트워크를 쓰지 않는다.
  it('실패는 잠시 기억해 연타를 막고 null을 돌려준다(지도는 학교 핀 없이 그대로 동작)', async () => {
    vi.mocked(geocodeLocation).mockRejectedValue(new Error('결과 없음'))
    expect(await getSchoolLocation(SCHOOL)).toBeNull()
    expect(await getSchoolLocation(SCHOOL)).toBeNull()
    expect(geocodeLocation).toHaveBeenCalledTimes(1)
  })

  // ⚠️ 예전엔 실패를 localStorage에 `{ failed: true }`로 **영구** 저장했다. 네트워크가 잠깐 끊긴 것만으로
  // 그 기기에서 학교 핀이 다시는 안 떴고 재시도할 방법이 없었다. 성공만 영구 캐시한다.
  it('일시 실패는 영구가 아니다 — 시간이 지나면 다시 시도한다', async () => {
    vi.useFakeTimers()
    try {
      vi.mocked(geocodeLocation).mockRejectedValueOnce(new Error('일시 장애'))
      expect(await getSchoolLocation(SCHOOL)).toBeNull()

      vi.advanceTimersByTime(6 * 60 * 1000)
      vi.mocked(geocodeLocation).mockResolvedValue({ x: '127', y: '36' })
      expect(await getSchoolLocation(SCHOOL)).toEqual({ lat: 36, lng: 127 })
    } finally {
      vi.useRealTimers()
    }
  })

  // 예전 버전이 남긴 영구 실패 기록을 가진 기기도 회복돼야 한다.
  it('예전 버전이 남긴 { failed: true } 기록은 무시하고 다시 조회한다', async () => {
    const { set } = await import('./storage.js')
    set('schoolLocations', { [SCHOOL.code]: { failed: true } })
    vi.mocked(geocodeLocation).mockResolvedValue({ x: '127', y: '36' })

    expect(await getSchoolLocation(SCHOOL)).toEqual({ lat: 36, lng: 127 })
  })

  it('좌표가 숫자로 안 오면 실패로 처리한다', async () => {
    vi.mocked(geocodeLocation).mockResolvedValue({ x: null, y: undefined })
    expect(await getSchoolLocation(SCHOOL)).toBeNull()
  })

  it('학교가 없으면 조회하지 않는다', async () => {
    expect(await getSchoolLocation(null)).toBeNull()
    expect(await getSchoolLocation({ name: '이름만' })).toBeNull()
    expect(geocodeLocation).not.toHaveBeenCalled()
  })
})
