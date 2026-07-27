// 급식(NEIS)·학식(대학) 화면이 공유하는 단일 식사 카드(4주차 보강 Step 6). "오늘 먹은 음식"
// (MealsPage.jsx)과 같은 디자인 언어(Card 컨테이너·제목 타이포·접기/펼치기 링크 버튼)를 따르되,
// 알레르기는 메뉴마다 칩을 반복하지 않고 번호 위첨자 + 카드 하단 범례 1줄로 축약한다 — 같은 성분이
// 메뉴 수만큼 반복 등장해 카드가 세로로 길어지던 문제를 없앤다.
import { useState } from 'react'
import Card from './Card.jsx'
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
function AllergyLegend({ menus, estimated }) {
  const allCodes = sortAllergyCodes(menus.flatMap((m) => m.allergyCodes || []))
  if (allCodes.length === 0) return null
  return (
    <p style={{ margin: `${spacing.sm}px 0 0`, fontSize: font.size.xs, color: colors.textSub }}>
      {estimated && <span style={{ color: colors.primary, fontWeight: 700 }}>추정 </span>}
      알레르기: {allCodes.map((c) => `${codeNumber(c)} ${getAllergenByCode(c)?.name ?? ''}`).join(' · ')}
    </p>
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

// onAnalyzeMenu가 있으면(학식) 메뉴별 가격 + [영양 분석] 버튼이 있는 한 줄씩 배치로,
// 없으면(급식, 액션 없음) 줄바꿈 인라인으로 공간을 아낀다.
function MenuList({ menus, onAnalyzeMenu }) {
  if (onAnalyzeMenu) {
    return (
      <ul style={{ margin: `${spacing.sm}px 0 0`, padding: 0, listStyle: 'none' }}>
        {menus.map((menu, i) => (
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
              {menu.price != null && (
                <span style={{ color: colors.textSub, fontSize: font.size.xs, marginLeft: 6 }}>
                  {menu.price.toLocaleString()}원
                </span>
              )}
            </span>
            <button type="button" className="tds-press" onClick={() => onAnalyzeMenu(menu.name)} style={ANALYZE_BUTTON_STYLE}>
              영양 분석
            </button>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <p style={{ margin: `${spacing.sm}px 0 0`, fontSize: font.size.sm, color: colors.textStrong, lineHeight: 1.9 }}>
      {menus.map((menu, i) => (
        <span key={i} style={{ marginRight: spacing.md }}>
          {menu.name}
          <MenuAllergyMarks codes={menu.allergyCodes} />
        </span>
      ))}
    </p>
  )
}

// title: '조식' 등. calories/price: 헤더 우측 표기(있는 것만). menus: [{name, allergyCodes, price?}].
// nutrients: [{key,label,unit,value}] | undefined(없으면 섹션 자체를 숨김). estimated: 학식(추정) true,
// 급식(NEIS 공식) false — 범례 앞 배지로만 구분하고 태그 하나하나에는 배지를 달지 않는다.
// onAnalyzeMenu: 있으면(학식) 메뉴별 [영양 분석] 버튼을 그린다.
export default function MealCard({ title, subtitle, calories, price, menus, nutrients, estimated = false, onAnalyzeMenu }) {
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

      <MenuList menus={menus} onAnalyzeMenu={onAnalyzeMenu} />
      <AllergyLegend menus={menus} estimated={estimated} />
      <NutrientSection nutrients={nutrients} />
    </Card>
  )
}
