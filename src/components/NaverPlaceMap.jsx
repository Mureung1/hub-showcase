import { useMemo, useRef } from 'react'
import { useNaverMap } from '../lib/useNaverMap.js'
import { colors, radius, spacing, styles } from '../styles/theme.js'

// 기존 PlaceMap(카카오)의 네이버 버전. 카카오 쪽은 롤백용으로 그대로 둔다.
//
// 좌표 규약: 식당 데이터(searchPlaces)는 여전히 카카오 로컬 검색 결과라 x=경도(lng), y=위도(lat)로
// 들어온다. 네이버 LatLng 생성자는 (위도, 경도) 순서이므로, 반드시 y→위도, x→경도로 매핑해야 한다.
// 순서를 바꾸면 마커가 엉뚱한 곳(바다 등)에 찍힌다.

// MapPage.jsx/PlaceList.jsx의 placeIdentity와 같은 규칙(같은 식당을 같은 키로 취급).
function placeIdentity(place) {
  return place.place_url || `${place.place_name}|${place.road_address_name}`
}

// occupationPlaces: 직업 맞춤 추천(FR-2.2/2.3) — places(부족 영양소 추천, 기본 빨간 핀)와 별개로
// 파란 원형 핀으로 그린다. 같은 식당이 양쪽에 다 있으면 직업 핀만 남긴다("직업 핀 우선").
export default function NaverPlaceMap({ myPosition, places = [], occupationPlaces = [] }) {
  const containerRef = useRef(null)

  const markers = useMemo(() => {
    const occupationIds = new Set(occupationPlaces.map(placeIdentity))

    const myLocationMarker = {
      id: 'me',
      lat: myPosition.lat,
      lng: myPosition.lng,
      // 내 위치는 식당 마커(기본 빨간 핀)와 구분되도록 포인트 컬러의 원형 아이콘을 쓴다.
      icon: {
        content: `<div style="width:16px;height:16px;border-radius:50%;background:${colors.primary};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>`,
        size: [22, 22],
        anchor: [11, 11],
      },
      content: '<div style="padding:4px 8px;font-size:12px;">내 위치</div>',
      alwaysOpen: true,
    }

    const placeMarkers = places
      // 직업 핀과 겹치는 식당은 기본 핀을 생략한다("직업 핀 우선", FR-2.3) — 아래에서 파란 핀으로 그린다.
      .filter((place) => !occupationIds.has(placeIdentity(place)))
      .map((place) => ({
        id: placeIdentity(place),
        lat: Number(place.y),
        lng: Number(place.x),
        content: `<div style="padding:4px 8px;font-size:12px;white-space:nowrap;">${place.place_name}</div>`,
      }))

    // 직업 맞춤 핀 — 기본 핀(빨강)과 구분되도록 파란 원형 아이콘을 쓴다(colors.info, 범례와 동일 색).
    const occupationMarkers = occupationPlaces.map((place) => ({
      id: `occ:${placeIdentity(place)}`,
      lat: Number(place.y),
      lng: Number(place.x),
      icon: {
        content: `<div style="width:14px;height:14px;border-radius:50%;background:${colors.info};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>`,
        size: [18, 18],
        anchor: [9, 9],
      },
      content: `<div style="padding:4px 8px;font-size:12px;white-space:nowrap;">${place.place_name}</div>`,
    }))

    return [myLocationMarker, ...placeMarkers, ...occupationMarkers]
  }, [myPosition, places, occupationPlaces])

  // markers에는 내 위치 핀이 항상 포함돼 있어(장소가 0개여도) 훅 내부의 "마커 있음" 판정만으로는
  // fitBounds 여부를 못 정한다 — 장소가 진짜 0개일 때 내 위치 한 점으로만 fitBounds하면 최대 줌으로
  // 조여버리므로(기존 버그였던 지점), 실제 장소(식당) 유무를 여기서 직접 계산해 넘긴다.
  const hasAnyPlace = places.length > 0 || occupationPlaces.length > 0

  const { loaded, error: loadError } = useNaverMap(containerRef, {
    center: myPosition,
    markers,
    fitToMarkers: hasAnyPlace,
  })

  if (loadError) {
    return (
      <div style={{ ...styles.card, textAlign: 'center' }}>
        <p style={styles.errorText}>지도를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.</p>
        <p style={{ ...styles.helperText, marginTop: spacing.xs }}>{loadError}</p>
      </div>
    )
  }

  if (!loaded) {
    return (
      <div style={{ ...styles.card, textAlign: 'center' }}>
        <p style={styles.helperText}>지도를 불러오는 중...</p>
      </div>
    )
  }

  return <div ref={containerRef} style={{ width: '100%', height: 320, borderRadius: radius.lg, overflow: 'hidden' }} />
}
