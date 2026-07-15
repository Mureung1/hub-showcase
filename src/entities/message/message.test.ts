/// <reference types="node" />

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  catAssistantAssets,
  catStageAssetPaths,
  dabnyangiAsset,
  scenarios,
  situationCardsFor,
  toneLabels,
} from './message'

describe('메시지 도메인 카탈로그', () => {
  it('네 관계에 각각 여섯 개의 상황 카드를 제공한다', () => {
    expect(scenarios).toHaveLength(4)

    for (const scenario of scenarios) {
      expect(situationCardsFor(scenario.id)).toHaveLength(6)
      expect(situationCardsFor(scenario.id)).toContainEqual({ id: 'apologize', label: '답장이 늦었을 때 사과' })
    }
  })

  it('결과 후보의 공통 톤 순서를 고정한다', () => {
    expect(toneLabels).toEqual({
      1: '기본',
      2: '더 부드럽게',
      3: '더 분명하게',
    })
  })

  it('네 관계의 정적 아바타와 브랜드 스테이지 에셋 경로를 제공한다', () => {
    for (const scenario of scenarios) {
      expect(catAssistantAssets[scenario.id].assetPath).toMatch(/^\/cats\/.+\.webp$/)
      expect(catStageAssetPaths[scenario.id]).toMatch(/^\/cats\/.+\.webp$/)
    }
  })

  it('런타임이 참조하는 냥이 WebP가 public 경로에 존재한다', () => {
    const assetPaths = [
      dabnyangiAsset.assetPath,
      '/cats/dabnyangi-thinking.webp',
      ...Object.values(catAssistantAssets).map((asset) => asset.assetPath),
      ...Object.values(catStageAssetPaths),
    ]

    for (const assetPath of assetPaths) {
      expect(assetPath).not.toBeNull()
      if (assetPath) {
        expect(existsSync(resolve('public', assetPath.slice(1))), assetPath).toBe(true)
      }
    }
  })
})
