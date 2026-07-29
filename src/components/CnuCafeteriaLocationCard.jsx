// 학식·급식 탭(대학) 전용 "식비 위치 보기" 접힘 카드 — 5주차 §2. 알레르기 안내 카드 바로 아래,
// 대학(university) 프로필에만 노출된다(초·중·고는 이 지도 데이터가 없어 렌더링 자체를 안 함,
// CafeteriaPanel.jsx 참고). 접힌 상태에서는 지도 컴포넌트 자체를 렌더링하지 않아 SDK·타일 요청이
// 전혀 나가지 않는다 — 펼쳤을 때만 마운트되는 lazy 초기화.
import { useMemo, useRef, useState } from 'react'
import Card from './Card.jsx'
import ChevronIcon from './ChevronIcon.jsx'
import { CNU_BUILDINGS, getCnuBuilding } from '../lib/cnuBuildings.js'
import { CNU_CAFETERIA_LOCATIONS } from '../data/cnuCafeteriaLocations.js'
import { openExternalLink } from '../lib/externalLink.js'
import { useNaverMap } from '../lib/useNaverMap.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

const MAP_HEIGHT = 200

function buildNaverMapSearchUrl(name) {
  return `https://map.naver.com/p/search/${encodeURIComponent(name)}`
}

function CnuCafeteriaMap({ selectedBuilding }) {
  const containerRef = useRef(null)

  const center = CNU_CAFETERIA_LOCATIONS[selectedBuilding] ?? CNU_CAFETERIA_LOCATIONS.cnu1

  const markers = useMemo(
    () =>
      CNU_BUILDINGS.map(({ key, mapSearchName }) => {
        const pos = CNU_CAFETERIA_LOCATIONS[key]
        const isSelected = key === selectedBuilding
        return {
          id: key,
          lat: pos.lat,
          lng: pos.lng,
          icon: isSelected
            ? {
                content: `<div style="width:20px;height:20px;border-radius:50%;background:${colors.primary};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
                size: [26, 26],
                anchor: [13, 13],
              }
            : {
                content: `<div style="width:12px;height:12px;border-radius:50%;background:${colors.muted};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
                size: [16, 16],
                anchor: [8, 8],
              },
          content: `<div style="padding:4px 8px;font-size:12px;white-space:nowrap;">${mapSearchName}</div>`,
        }
      }),
    [selectedBuilding],
  )

  // 5개 마커는 선택과 무관하게 항상 전부 그려지므로(강조만 바뀜) fitBounds를 쓰면 어느 건물을
  // 선택하든 뷰가 똑같아져 "선택 시 중심 이동"이 안 보인다 — 대신 줌을 고정하고 중심만 선택된
  // 건물로 옮긴다. 5개 건물이 남북 약 1.2km 안에 모여 있고, 클러스터 양 끝(1학·생과대)을 중심으로
  // 잡으면 반대쪽 끝이 200px 높이 미리보기 밖으로 밀려날 수 있어, 줌 13으로 한 단계 더 낮춰 어느
  // 건물이 중심이어도 나머지 4개가 항상 함께 보이게 한다.
  const { loaded, error } = useNaverMap(containerRef, { center, zoom: 13, markers, fitToMarkers: false })

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: spacing.md }}>
        <p style={styles.errorText}>지도를 불러올 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height: MAP_HEIGHT, borderRadius: radius.md, overflow: 'hidden', background: colors.bg }}>
      {!loaded && (
        <p style={{ ...styles.helperText, textAlign: 'center', padding: spacing.lg, margin: 0 }}>지도를 불러오는 중...</p>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

export default function CnuCafeteriaLocationCard({ selectedBuilding }) {
  const [open, setOpen] = useState(false)
  const building = getCnuBuilding(selectedBuilding)

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <button
        type="button"
        className="tds-press"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          background: 'none',
          border: 'none',
          padding: spacing.lg,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: font.size.sm, fontWeight: 600, color: colors.textStrong }}>학생 식당위치</span>
        <span style={{ color: colors.muted }}>
          <ChevronIcon open={open} />
        </span>
      </button>

      {open && (
        <div style={{ padding: `0 ${spacing.lg}px ${spacing.lg}px` }}>
          <CnuCafeteriaMap selectedBuilding={selectedBuilding} />
          <button
            type="button"
            className="tds-press"
            onClick={() => openExternalLink(buildNaverMapSearchUrl(building.mapSearchName))}
            style={{ ...styles.linkButton, display: 'block', width: '100%', textAlign: 'center', marginTop: spacing.sm }}
          >
            네이버 지도에서 길찾기
          </button>
        </div>
      )}
    </Card>
  )
}
