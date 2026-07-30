import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'
import { DEMO_TECH_SLUGS, getHeatmapLevel, getTechIconPath } from './techPresentation.js'

test('히트맵 경계값을 퍼센트로 분류한다', () => {
  assert.deepEqual(getHeatmapLevel(0), { label: '약', tone: 1 })
  assert.deepEqual(getHeatmapLevel(20), { label: '약', tone: 1 })
  assert.deepEqual(getHeatmapLevel(21), { label: '중', tone: 2 })
  assert.deepEqual(getHeatmapLevel(99), { label: '중', tone: 2 })
  assert.deepEqual(getHeatmapLevel(100), { label: '강', tone: 3 })
})

test('결측값과 숫자가 아닌 값만 등급 없음으로 처리한다', () => {
  assert.equal(getHeatmapLevel(null), null)
  assert.equal(getHeatmapLevel(undefined), null)
  assert.equal(getHeatmapLevel(''), null)
  assert.equal(getHeatmapLevel('알 수 없음'), null)
})

test('생성 데이터의 기술 slug 40개를 모두 명시 매핑한다', () => {
  assert.equal(DEMO_TECH_SLUGS.length, 40)
  for (const slug of DEMO_TECH_SLUGS) {
    const iconPath = getTechIconPath(slug)
    assert.notEqual(iconPath, '/logos/technology.svg')
    assert.ok(existsSync(new URL(`../../public${iconPath}`, import.meta.url)), `${slug} 아이콘 파일이 없습니다`)
  }
})

test('알 수 없는 slug는 범용 기술 아이콘을 사용한다', () => {
  assert.equal(getTechIconPath('new-technology'), '/logos/technology.svg')
})
