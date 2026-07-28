// 급식(NEIS)·학식(대학) 화면이 공유하는 단일 식사 카드(4주차 보강 Step 6). "오늘 먹은 음식"
// (MealsPage.jsx)과 같은 디자인 언어(Card 컨테이너·제목 타이포·접기/펼치기 링크 버튼)를 따르되,
// 알레르기는 메뉴마다 칩을 반복하지 않고 번호 위첨자 + 카드 하단 범례 1줄로 축약한다 — 같은 성분이
// 메뉴 수만큼 반복 등장해 카드가 세로로 길어지던 문제를 없앤다.
import { useState } from 'react'
import AppButton from './AppButton.jsx'
import Card from './Card.jsx'
import Spinner from './Spinner.jsx'
import { findAllergyConflicts } from '../lib/allergyConflicts.js'
import { getAllergenByCode } from '../lib/allergyRules.js'
import { codeNumber, sortAllergyCodes, toSuperscript } from '../lib/allergyDisplay.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

// 메뉴명 옆에 붙는 작은 위첨자 번호 — 코드표(범례)와 오름차순으로 정확히 대응한다.
function MenuAllergyMarks({ codes }) {
  const sorted = sortAllergyCodes(codes)
  if (sorted.length === 0) return null
  return <sup style={{ color: colors.primary, fontWeight: 700, marginLeft: 2 }}>{sorted.map((c) => toSuperscript(codeNumber(c))).join('·')}</sup>
}

// 카드 안 모든 메뉴의 알레르기 코드를 중복 제거·오름차순으로 모아 한 줄로만 보여준다.
// showPerItemDetail(stacked 레이아웃 전용, 6주차 §4): 메뉴명 옆 위첨자 번호를 렌더링하지 않는 대신,
// "더보기"를 펼치면 메뉴별 알레르기 번호 목록을 보여줘 정보 손실이 없게 한다.
function AllergyLegend({ menus, estimated, showPerItemDetail = false }) {
  const [expanded, setExpanded] = useState(false)
  const allCodes = sortAllergyCodes(menus.flatMap((m) => m.allergyCodes || []))
  if (allCodes.length === 0) return null

  return (
    <>
      <p style={{ margin: `${spacing.sm}px 0 0`, fontSize: font.size.xs, color: colors.textSub }}>
        {estimated && <span style={{ color: colors.primary, fontWeight: 700 }}>추정 </span>}
        알레르기: {allCodes.map((c) => `${codeNumber(c)} ${getAllergenByCode(c)?.name ?? ''}`).join(' · ')}
      </p>
      {showPerItemDetail && (
        <>
          <button
            type="button"
            className="tds-press"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            style={{ ...styles.linkButton, marginTop: spacing.xs, fontSize: font.size.xs }}
          >
            {expanded ? '메뉴별 알레르기 접기' : '메뉴별 알레르기 더보기'}
          </button>
          {expanded && (
            <ul style={{ margin: `${spacing.xs}px 0 0`, padding: 0, listStyle: 'none' }}>
              {menus.map((menu, i) => {
                const codes = sortAllergyCodes(menu.allergyCodes || [])
                return (
                  <li key={i} style={{ fontSize: font.size.xs, color: colors.textSub, padding: '2px 0' }}>
                    {menu.name}: {codes.length > 0 ? codes.map((c) => codeNumber(c)).join('·') : '없음'}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </>
  )
}

// 이 카드에 담긴 메뉴 전체를 훑어 프로필 알레르기와 겹치는 M코드를 하나로 모은다(중복 제거).
// 트랙 3 §2 — 프로필 알레르기와 급식/학식 메뉴의 M코드가 둘 다 있었는데 여태 서로 대조된 적이 없었다.
function collectCardConflicts(menus, profileAllergies) {
  const codes = new Set()
  for (const menu of menus) {
    for (const code of findAllergyConflicts(profileAllergies, menu.allergyCodes)) codes.add(code)
  }
  return sortAllergyCodes([...codes])
}

// 카드 상단 경고 배너 — "겹치는 게 없음"은 절대 "안전함"으로 표시하지 않는다(경고가 있을 때만 렌더).
// estimated(학식)면 실제 재료 확인을 한 번 더 당부한다 — 키워드 추정이라 놓칠 수 있어서다.
function ConflictBanner({ codes, estimated }) {
  if (codes.length === 0) return null
  const names = codes.map((c) => getAllergenByCode(c)?.name).filter(Boolean).join('·')

  return (
    <div
      style={{
        marginTop: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.sm,
        background: colors.dangerSurface,
      }}
    >
      <p style={{ margin: 0, fontSize: font.size.sm, fontWeight: 700, color: colors.dangerText }}>
        ⚠️ 등록한 알레르기({names})가 포함된 메뉴가 있어요
      </p>
      {estimated && (
        <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: font.size.xs, color: colors.dangerText }}>
          이 메뉴는 이름 기반 추정 정보예요 — 실제 재료를 꼭 확인하세요.
        </p>
      )}
    </div>
  )
}

const NUTRIENT_SUMMARY_LIMIT = 3

// nutrients: [{ key, label, unit, value }] — value가 있는 항목만 호출부가 걸러 넘긴다.
// 처음 NUTRIENT_SUMMARY_LIMIT개만 보여주고, 나머지는 "더보기"로 펼친다(막대그래프 없이 같은
// 텍스트 톤 유지 — NEIS 미량영양소는 앱 기준 막대 스케일이 없어 억지로 만들지 않는다).
function NutrientSection({ nutrients }) {
  const [expanded, setExpanded] = useState(false)
  if (!nutrients || nutrients.length === 0) return null

  const shown = expanded ? nutrients : nutrients.slice(0, NUTRIENT_SUMMARY_LIMIT)

  return (
    <>
      <p style={{ margin: `${spacing.sm}px 0 0`, fontSize: font.size.xs, color: colors.textSub }}>
        {shown.map((n, i) => (
          <span key={n.key}>
            {i > 0 && ' · '}
            {n.label} {n.value}
            {n.unit}
          </span>
        ))}
      </p>
      {nutrients.length > NUTRIENT_SUMMARY_LIMIT && (
        <button
          type="button"
          className="tds-press"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          style={{ ...styles.linkButton, marginTop: spacing.xs, fontSize: font.size.xs }}
        >
          {expanded ? '접기' : '더보기'}
        </button>
      )}
    </>
  )
}

const ANALYZE_BUTTON_STYLE = {
  padding: '4px 10px',
  borderRadius: radius.sm,
  border: `1px solid ${colors.primary}`,
  background: '#fff',
  color: colors.primary,
  fontSize: font.size.xs,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
}

// layout: 'numbered'(기존 — 학식. 메뉴별 가격 + [영양 분석] 버튼이 있는 한 줄씩 배치, 위첨자
//   알레르기 번호) | 'stacked'(6주차 §4 — 급식. 한 줄에 1개씩 세로·가운데 정렬·불릿 없음·본문보다
//   한 단계 큰 글자, 위첨자 번호 없이 카드 하단 통합 범례 + "더보기"로만 알레르기 확인).
// analyzingMenu: 지금 분석 요청이 나가 있는 메뉴명(6주차 §1-B, precisionEngine 호출은 비동기라
// 캐시 미스 시 몇 초 걸릴 수 있다) — 클릭한 버튼엔 스피너를, 나머지 버튼은 비활성화한다(동시에 두
// 요청을 보내면 먼저 끝난 쪽만 결과 화면으로 넘어가고 나중 요청은 조용히 버려지므로, 아예 동시
// 요청 자체를 막는 편이 낫다). 다만 "왜 안 눌리는지" 알 수 있도록 흐리게 표시한다(리뷰에서 발견 —
// 이전엔 비활성화만 되고 스타일은 그대로라 눌러도 아무 반응 없는 것처럼 보였다).
// 메뉴 하나가 프로필 알레르기와 겹칠 때만 보이는 작은 경고 표시. 카드 상단 배너(ConflictBanner)가
// "이 카드 어딘가에 있다"를 알리는 자리라면, 이건 "정확히 어느 메뉴인지"를 짚어주는 자리다.
function ConflictMark() {
  return (
    <span aria-label="알레르기 주의" style={{ color: colors.dangerText, marginLeft: 4 }}>
      ⚠️
    </span>
  )
}

function MenuList({ menus, layout, onAnalyzeMenu, analyzingMenu, profileAllergies }) {
  if (layout === 'stacked') {
    return (
      <ul style={{ margin: `${spacing.md}px 0 0`, padding: 0, listStyle: 'none', textAlign: 'center' }}>
        {menus.map((menu, i) => (
          <li key={i} style={{ fontSize: font.size.lg, color: colors.textStrong, lineHeight: 2, fontWeight: 600 }}>
            {menu.name}
            {findAllergyConflicts(profileAllergies, menu.allergyCodes).length > 0 && <ConflictMark />}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul style={{ margin: `${spacing.sm}px 0 0`, padding: 0, listStyle: 'none' }}>
      {menus.map((menu, i) => {
        const isAnalyzing = analyzingMenu === menu.name
        return (
          <li
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.sm,
              padding: `${spacing.xs}px 0`,
              borderTop: i > 0 ? `1px solid ${colors.border}` : 'none',
            }}
          >
            <span style={{ fontSize: font.size.sm, color: colors.textStrong }}>
              {menu.name}
              <MenuAllergyMarks codes={menu.allergyCodes} />
              {findAllergyConflicts(profileAllergies, menu.allergyCodes).length > 0 && <ConflictMark />}
              {menu.price != null && (
                <span style={{ color: colors.textSub, fontSize: font.size.xs, marginLeft: 6 }}>
                  {menu.price.toLocaleString()}원
                </span>
              )}
            </span>
            {onAnalyzeMenu && (
              <button
                type="button"
                className="tds-press"
                onClick={() => onAnalyzeMenu(menu.name)}
                disabled={Boolean(analyzingMenu)}
                style={{
                  ...ANALYZE_BUTTON_STYLE,
                  opacity: analyzingMenu && !isAnalyzing ? 0.4 : 1,
                  cursor: analyzingMenu ? 'not-allowed' : 'pointer',
                }}
              >
                {isAnalyzing ? <Spinner size={12} /> : '영양 분석'}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// title: '조식' 등. calories/price: 헤더 우측 표기(있는 것만). menus: [{name, allergyCodes, price?}].
// nutrients: [{key,label,unit,value}] | undefined(없으면 섹션 자체를 숨김). estimated: 학식(추정) true,
// 급식(NEIS 공식) false — 범례 앞 배지로만 구분하고 태그 하나하나에는 배지를 달지 않는다.
// onAnalyzeMenu: 있으면(학식) 메뉴별 [영양 분석] 버튼을 그린다(6주차 §1-B부터 precisionEngine
// 단일 항목 모드 — analyzingMenu/menuError로 진행/실패 상태를 받는다).
// onAnalyzeTray: 있으면(5주차 §3-B, 6주차 §1-B부터 precisionEngine 경유) "한 판 통합 분석" 버튼을
// 그린다 — 메뉴별 [영양 분석](작은 아웃라인)과 시각적으로 구분되도록 카드 하단에 꽉 찬 주 버튼으로
// 둔다(이쪽이 주 동선). 캐시 미스 시 식약처 DB 매칭 실패분을 Gemini로 추정하느라 몇 초 걸릴 수
// 있어 "정밀 분석 중…" 문구로 기다림을 명시한다(캐시 히트면 이 상태를 거의 못 볼 만큼 빠르다).
export default function MealCard({
  title,
  subtitle,
  calories,
  price,
  menus,
  nutrients,
  estimated = false,
  // layout: 'numbered'(기본값 — 학식) | 'stacked'(급식, 6주차 §4). 기본값을 반드시 'numbered'로
  // 둬야 layout을 넘기지 않는 기존 호출부(학식)가 그대로 동작한다.
  layout = 'numbered',
  onAnalyzeMenu,
  analyzingMenu = null,
  menuError = '',
  onAnalyzeTray,
  trayAnalyzing = false,
  trayError = '',
  // 트랙 3 §2 — profile.allergies 그대로 넘기면 된다(빈 배열/undefined면 경고 자체가 안 뜬다).
  profileAllergies = [],
}) {
  const cardConflicts = collectCardConflicts(menus, profileAllergies)

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ margin: 0, fontSize: font.size.md, fontWeight: 700, color: colors.textStrong }}>{title}</h3>
        {(price != null || calories != null) && (
          <span style={{ fontSize: font.size.sm, color: colors.textSub, whiteSpace: 'nowrap' }}>
            {price != null && `${price.toLocaleString()}원`}
            {price != null && calories != null && ' · '}
            {calories != null && `${calories}kcal`}
          </span>
        )}
      </div>
      {subtitle && <p style={{ margin: '2px 0 0', fontSize: font.size.xs, color: colors.textSub }}>{subtitle}</p>}
      <ConflictBanner codes={cardConflicts} estimated={estimated} />

      <MenuList menus={menus} layout={layout} onAnalyzeMenu={onAnalyzeMenu} analyzingMenu={analyzingMenu} profileAllergies={profileAllergies} />
      {menuError && <p style={{ ...styles.errorText, textAlign: 'center' }}>{menuError}</p>}
      <AllergyLegend menus={menus} estimated={estimated} showPerItemDetail={layout === 'stacked'} />
      <NutrientSection nutrients={nutrients} />

      {onAnalyzeTray && (
        <div style={{ marginTop: spacing.md }}>
          <AppButton onClick={onAnalyzeTray} disabled={trayAnalyzing}>
            {trayAnalyzing && <Spinner size={16} />}
            {trayAnalyzing ? '정밀 분석 중… 최대 10초' : '한 판 통합 분석'}
          </AppButton>
          {trayError && <p style={{ ...styles.errorText, textAlign: 'center' }}>{trayError}</p>}
        </div>
      )}
    </Card>
  )
}
