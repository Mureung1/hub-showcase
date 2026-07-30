// 중량 결정 규칙 고정 테스트.
//
// 이 파일이 지키는 핵심은 하나다: **근거 없는 기본값으로 근거 있는 값을 기각하지 않는다.**
// 같은 오류가 세 번 다른 얼굴로 나왔고(servingWeight.js 헤더 주석), 세 번 다 "1인분이 실제의
// 1/4로 계산되는" 같은 증상으로 나타났다. 회귀하면 여기서 잡힌다.
import { describe, it, expect } from 'vitest'
import { effectiveRole, isUsableServingGram, resolveServingWeight, resolveStandardServingGram } from './servingWeight.js'

describe('effectiveRole', () => {
  it('이름 패턴이 걸리면 그것을 쓰고 known', () => {
    expect(effectiveRole('김치찌개')).toMatchObject({ role: 'soup', known: true, source: 'pattern' })
  })

  it('패턴이 안 걸리면 AI 힌트로 메우고 known', () => {
    expect(effectiveRole('푸팟퐁커리', 'main')).toMatchObject({ role: 'main', known: true, source: 'hint' })
  })

  it('패턴이 걸리면 AI 힌트보다 항상 우선한다 — 재현 가능성', () => {
    expect(effectiveRole('김치찌개', 'dessert')).toMatchObject({ role: 'soup', source: 'pattern' })
  })

  it('둘 다 없으면 기본값이지만 known=false — 근거로 쓰면 안 된다는 표시', () => {
    expect(effectiveRole('정체불명음식')).toMatchObject({ known: false, source: 'default' })
  })

  it('알 수 없는 역할 문자열은 힌트로 인정하지 않는다', () => {
    expect(effectiveRole('정체불명음식', 'nonsense')).toMatchObject({ known: false })
  })
})

describe('isUsableServingGram', () => {
  it('기준량 placeholder(정확히 100g)는 제공량이 아니다', () => {
    expect(isUsableServingGram(100)).toBe(false)
    expect(isUsableServingGram(99)).toBe(true)
  })

  it('숫자가 아니거나 0 이하면 못 쓴다', () => {
    for (const v of [null, undefined, 0, -1, NaN, '200']) expect(isUsableServingGram(v)).toBe(false)
  })
})

describe('resolveStandardServingGram — 역할 절대범위', () => {
  // 실측: 프랜차이즈 레코드 8,259건 중 57.5%가 이 규칙 하나로 진짜 제공량을 기각당했다.
  // 원인은 "역할을 못 알아본 음식 = 반찬(20~150g)"이라는 근거 없는 가정이었다.
  it('역할을 모르는 음식에는 반찬 범위(20~150g)를 들이대지 않는다', () => {
    expect(resolveStandardServingGram('정체불명도시락', 480, { context: 'restaurant' })).toBe(480)
  })

  it('역할을 아는 음식에는 그 역할의 범위를 적용해 이상치를 기각한다', () => {
    // 국 1인분이 1000g일 리 없다(soup 상한 900).
    expect(resolveStandardServingGram('연포탕', 1000, { context: 'restaurant' })).not.toBe(1000)
  })

  it('AI 역할 힌트가 있으면 그 역할의 범위가 적용된다', () => {
    expect(resolveStandardServingGram('정체불명국물', 1000, { context: 'restaurant', roleHint: 'soup' })).not.toBe(1000)
  })

  it('범용 범위를 벗어나는 단위 오기는 역할을 몰라도 기각한다', () => {
    expect(resolveStandardServingGram('정체불명음식', 5000, { context: 'restaurant' })).not.toBe(5000)
  })
})

describe('resolveStandardServingGram — 맥락별 우선순위', () => {
  it('식당: 우리가 검증한 정량 사전이 DB 제공량보다 먼저다', () => {
    // 돼지갈비 referenceGrams = 200 (foodData.js)
    expect(resolveStandardServingGram('돼지갈비', 180, { context: 'restaurant' })).toBe(200)
  })

  it('급식: 역할 표준이 최우선 — 트레이 안에서 밥 무게가 메뉴명마다 달라지면 안 된다', () => {
    // 쌀밥/잡곡밥 레코드의 제공량이 제각각이어도(450g/290g) 트레이에선 rice 표준 210g으로 고정된다.
    expect(resolveStandardServingGram('잡곡밥', 290, { context: 'cafeteria' })).toBe(210)
    expect(resolveStandardServingGram('쌀밥', 450, { context: 'cafeteria' })).toBe(210)
  })

  it('포장·프랜차이즈: 제조사가 표시한 1회 제공량이 곧 정답이다', () => {
    // 한식 역할 표준(반찬 50g 등)을 들이대면 안 되는 영역 — 초코바 20g도 도시락 700g도 정상이다.
    expect(resolveStandardServingGram('정체불명초코바', 22, { context: 'packaged' })).toBe(22)
    expect(resolveStandardServingGram('정체불명도시락', 700, { context: 'packaged' })).toBe(700)
  })

  it('포장 맥락에서도 기준량 placeholder(100g)는 제공량으로 쓰지 않는다', () => {
    expect(resolveStandardServingGram('정체불명과자', 100, { context: 'packaged' })).not.toBe(100)
  })
})

describe('resolveServingWeight — 근거 추적', () => {
  // founded=false는 "이 숫자엔 아무 근거가 없다"는 뜻이고, 사진 경로의 배식비율 계산이 이 플래그로
  // 열리고 닫힌다. 근거 없는 중립값에 비율을 곱하면 모르는 값끼리 곱하는 셈이라 오히려 나빠진다.
  it('정량 사전에서 나왔으면 founded', () => {
    expect(resolveServingWeight('돼지갈비', null, { context: 'restaurant' })).toMatchObject({ grams: 200, source: 'reference', founded: true })
  })

  it('아무 근거도 없으면 중립값 + founded=false', () => {
    expect(resolveServingWeight('정체불명음식', null, { context: 'restaurant' })).toMatchObject({ source: 'neutral', founded: false })
  })

  it('AI 힌트로 역할을 알았으면 founded', () => {
    expect(resolveServingWeight('정체불명국물', null, { context: 'restaurant', roleHint: 'soup' })).toMatchObject({
      source: 'role',
      founded: true,
    })
  })

  it('resolveStandardServingGram은 같은 판단의 grams만 돌려준다', () => {
    const opts = { context: 'restaurant', roleHint: 'main' }
    expect(resolveStandardServingGram('정체불명구이', null, opts)).toBe(resolveServingWeight('정체불명구이', null, opts).grams)
  })
})
