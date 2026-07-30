// 지도 초기 화면 회귀 방지 — "처음 열었는데 대한민국 전체가 보인다"를 막는다.
//
// 원인이었던 것: 학식·급식 뷰가 학교 설정과 무관하게 충남대 학식당 5곳을 항상 핀으로 띄웠고,
// 내 위치가 서울이면 fitBounds가 서울과 대전을 **둘 다** 담으려고 남한 전체로 줌아웃했다.
// 두 겹으로 막는다: ① 화면에 관계있는 핀만 띄운다(MapPage) ② 그래도 멀면 최저 줌으로 자른다(여기).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { useRef } from 'react'
import { useNaverMap } from './useNaverMap.js'

vi.mock('./useNaverMapLoader.js', () => ({ useNaverMapLoader: () => ({ loaded: true, error: null }) }))

let mapInstance
let boundsSeed
let boundsExtended

function installNaverStub(initialZoom) {
  boundsSeed = []
  boundsExtended = []
  mapInstance = {
    zoom: 15,
    center: null,
    fitBounds: vi.fn(function () {
      // 실제 SDK처럼 "bounds를 다 담느라 줌이 내려간" 상황을 흉내낸다.
      this.zoom = initialZoom
    }),
    getZoom: vi.fn(function () {
      return this.zoom
    }),
    setZoom: vi.fn(function (z) {
      this.zoom = z
    }),
    setCenter: vi.fn(function (c) {
      this.center = c
    }),
  }
  window.naver = {
    maps: {
      LatLng: class {
        constructor(lat, lng) {
          this.lat = lat
          this.lng = lng
        }
      },
      LatLngBounds: class {
        constructor(a) {
          boundsSeed.push(a)
          this.points = [a]
        }
        extend(p) {
          this.points.push(p)
          boundsExtended.push(p)
        }
      },
      // `new naver.maps.Map(...)`으로 호출되므로 화살표 함수는 쓸 수 없다(생성자가 아니다).
      Map: vi.fn(function () {
        return mapInstance
      }),
      Marker: vi.fn(function () {
        return { setMap: vi.fn() }
      }),
      InfoWindow: vi.fn(function () {
        return { open: vi.fn() }
      }),
      Size: class {},
      Point: class {},
      Event: { addListener: vi.fn(), trigger: vi.fn() },
    },
  }
}

function Harness(props) {
  const ref = useRef(null)
  useNaverMap(ref, props)
  return <div ref={ref} />
}

beforeEach(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})

const CENTER = { lat: 37.5665, lng: 126.978 }
const MARKERS = [
  { id: 'me', lat: 37.5665, lng: 126.978 },
  { id: 'far', lat: 36.3665, lng: 127.3448 },
]

describe('useNaverMap — fitBounds 최저 줌', () => {
  it('멀리 떨어진 핀 때문에 전국 지도로 줌아웃하면 최저 줌으로 되돌린다', () => {
    installNaverStub(7) // 남한 전체가 보이는 수준
    render(<Harness center={CENTER} markers={MARKERS} fitToMarkers />)

    expect(mapInstance.setZoom).toHaveBeenCalledWith(12)
    // 줌만 되돌리면 중심이 두 핀의 중간(아무것도 없는 곳)에 남는다 — 중심도 함께 되돌려야 한다.
    expect(mapInstance.setCenter).toHaveBeenCalled()
  })

  it('적절한 줌으로 맞춰졌으면 건드리지 않는다', () => {
    installNaverStub(16)
    render(<Harness center={CENTER} markers={MARKERS} fitToMarkers />)
    expect(mapInstance.setZoom).not.toHaveBeenCalled()
  })

  it('fitToMarkers가 꺼져 있으면 중심만 잡고 fitBounds를 아예 안 부른다', () => {
    installNaverStub(7)
    render(<Harness center={CENTER} markers={MARKERS} fitToMarkers={false} />)
    expect(mapInstance.fitBounds).not.toHaveBeenCalled()
  })
})

// 대학 학식당처럼 "그 장소들이 한눈에 들어오는 게 목적"인 화면에서는 내 위치를 화면 맞춤 계산에서
// 빼야 한다. 안 그러면 타지에 있을 때 내 위치까지 담으려다 다시 전국 지도가 된다.
describe('useNaverMap — skipBounds', () => {
  const allPoints = () => [...boundsSeed, ...boundsExtended]

  it('skipBounds 마커는 화면 맞춤 계산에서 빠진다', () => {
    installNaverStub(16)
    render(
      <Harness
        center={CENTER}
        markers={[{ id: 'me', lat: 37.5665, lng: 126.978, skipBounds: true }, { id: 'a', lat: 36.36, lng: 127.34 }]}
        fitToMarkers
      />,
    )
    // bounds에는 학식당(36.36)만 들어가고 내 위치(37.5665)는 없어야 한다.
    expect(allPoints().some((p) => p.lat === 36.36)).toBe(true)
    expect(allPoints().some((p) => p.lat === 37.5665)).toBe(false)
  })

  // 예전엔 bounds를 centerLatLng(= 내 위치)로 씨앗을 깔아서, 마커를 빼도 중심이 bounds에 남았다.
  it('bounds 씨앗에도 내 위치가 들어가지 않는다', () => {
    installNaverStub(16)
    render(<Harness center={CENTER} markers={[{ id: 'me', lat: CENTER.lat, lng: CENTER.lng, skipBounds: true }, { id: 'a', lat: 36.36, lng: 127.34 }]} fitToMarkers />)
    expect(boundsSeed.every((p) => p.lat !== CENTER.lat)).toBe(true)
  })

  it('skipBounds 마커만 있으면 fitBounds를 부르지 않는다', () => {
    installNaverStub(16)
    render(<Harness center={CENTER} markers={[{ id: 'me', lat: CENTER.lat, lng: CENTER.lng, skipBounds: true }]} fitToMarkers />)
    expect(mapInstance.fitBounds).not.toHaveBeenCalled()
  })
})
