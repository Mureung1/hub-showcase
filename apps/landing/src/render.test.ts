import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { renderLandingDocument } from './render.js'
import {
  landingReleaseDisplayWith,
  validLandingReleaseDisplay,
} from './testing/release-display-fixtures.test.js'

test('valid release display renders one product h1 and exact first-fold command', () => {
  const html = renderLandingDocument(validLandingReleaseDisplay)

  assert.equal(countMatches(html, /<h1(?:\s|>)/gu), 1)
  assert.match(html, /<h1[^>]*>한 학기를 함께 관리하는 AY<\/h1>/u)
  assert.equal(
    countLiteral(html, validLandingReleaseDisplay.release.exactCommand),
    2,
  )
  assert.match(html, /CURRENT PUBLIC PREVIEW/u)
  assert.match(html, /AVAILABLE/u)
  assert.match(html, /COMING NEXT/u)
  assert.doesNotMatch(html, /@latest|<release-version>|--yes/u)
})

test('rendered release truth preserves exact owner values and destinations', () => {
  const html = renderLandingDocument(validLandingReleaseDisplay)

  for (const bytes of [
    validLandingReleaseDisplay.runtime.firstDownloadBytes,
    validLandingReleaseDisplay.runtime.installedRegularBytes,
    validLandingReleaseDisplay.runtime.conservativeFreeSpaceBytes,
  ]) {
    assert.match(html, new RegExp(`data-bytes="${bytes}"`, 'u'))
    assert.match(html, new RegExp(String(bytes), 'u'))
  }
  assert.match(
    html,
    new RegExp(
      escapeRegExp(validLandingReleaseDisplay.runtime.cacheDisplayLocation),
      'u',
    ),
  )
  assert.match(
    html,
    new RegExp(
      validLandingReleaseDisplay.compatibility.browsers[0].minimumMajor.toString(),
      'u',
    ),
  )

  for (const link of Object.values(validLandingReleaseDisplay.links).filter(
    (value): value is { readonly url: string } =>
      typeof value === 'object',
  )) {
    assert.match(html, new RegExp(`href="${escapeRegExp(link.url)}"`, 'u'))
  }
})

test('rendered interactions are keyboard-native and announce exact copy feedback', () => {
  const html = renderLandingDocument(validLandingReleaseDisplay)
  const css = readFileSync(
    new URL('../public/landing.css', import.meta.url),
    'utf8',
  )

  assert.match(html, /<button[^>]+data-copy-command/u)
  assert.match(html, /aria-describedby="command-copy-status"/u)
  assert.match(
    html,
    /id="command-copy-status"[^>]+role="status"[^>]+aria-live="polite"/u,
  )
  assert.match(html, /navigator\.clipboard\.writeText\(command\)/u)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/u)
  assert.match(css, /overflow-x: clip/u)
})

test('promise list copy stays in one grid child when it contains inline emphasis', () => {
  const html = renderLandingDocument(validLandingReleaseDisplay)
  const promiseLists = [
    ...html.matchAll(
      /<ul class="(?:check-list|arrow-list)">([\s\S]*?)<\/ul>/gu,
    ),
  ]

  assert.equal(promiseLists.length, 2)

  const promiseItems = promiseLists.flatMap((list) => [
    ...(list[1] ?? '').matchAll(/<li>([\s\S]*?)<\/li>/gu),
  ])
  assert.equal(promiseItems.length, 8)

  for (const item of promiseItems) {
    assert.match(
      item[1] ?? '',
      /^\s*<span class="list-copy">[\s\S]*<\/span>\s*$/u,
    )
  }

  assert.match(
    promiseItems[0]?.[1] ?? '',
    /<span class="list-copy">Exact <code>npx<\/code> application 실행<\/span>/u,
  )
  assert.match(
    promiseItems[4]?.[1] ?? '',
    /<span class="list-copy"><strong>학기 공간 준비 완료<\/strong>와 same-version relaunch<\/span>/u,
  )
})

test('missing or mismatched input produces no publishable document', () => {
  assert.throws(() => renderLandingDocument(undefined))
  assert.throws(() =>
    renderLandingDocument(
      landingReleaseDisplayWith((value) => {
        const release = value.release as Record<string, unknown>
        release.exactCommand = 'npx ay-ple@latest'
      }),
    ),
  )
})

test('rollback surface only exists for a validated still-supported pair', () => {
  const firstRelease = renderLandingDocument(validLandingReleaseDisplay)
  assert.doesNotMatch(firstRelease, /이전 지원 버전/u)

  const withRollback = renderLandingDocument(
    landingReleaseDisplayWith((value) => {
      value.rollback = {
        status: 'still-supported',
        applicationVersion: '7.3.1',
        exactCommand: 'npx ay-ple@7.3.1',
        releaseEvidence: {
          url: 'https://example.com/ay-ple-fixture/releases/v7.3.1',
        },
      }
    }),
  )
  assert.match(withRollback, /이전 지원 버전/u)
  assert.match(withRollback, /npx ay-ple@7\.3\.1/u)
})

function countMatches(value: string, expression: RegExp): number {
  return [...value.matchAll(expression)].length
}

function countLiteral(value: string, literal: string): number {
  return value.split(literal).length - 1
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}
