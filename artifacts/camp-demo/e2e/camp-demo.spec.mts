/// <reference lib="dom" />

import { fileURLToPath } from 'node:url'
import { expect, test } from 'playwright/test'
import {
  startViteTestServer,
  type ViteTestServer,
} from '../../../apps/inspector/e2e/vite-test-server.ts'

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url))
const presentationViewports = [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const

let demoServer: ViteTestServer
let demoUrl: string

test.beforeAll(async () => {
  demoServer = await startViteTestServer({
    root: workspaceRoot,
    clearScreen: false,
    logLevel: 'error',
    server: {
      hmr: false,
      middlewareMode: true,
    },
  })
  demoUrl = demoServer.url
})

test.afterAll(async () => {
  await demoServer.close()
})

test('camp demo deck keeps the product-led main arc and explicit appendix navigation', async ({
  page,
  request,
}) => {
  await page.goto(`${demoUrl}/artifacts/camp-demo/#product-promise`)

  await expect(
    page.getByRole('main', { name: 'AY-PLE 캠프 발표 자료' }),
  ).toBeVisible()
  await expect(page.locator('#slideCounter')).toHaveText('1 / 8')
  await expect(page.locator('#slideDots button')).toHaveCount(8)
  await expect(
    page.getByRole('button', { name: '본편 마무리로 돌아가기' }),
  ).toBeHidden()

  const mainSlides = [
    ['product-promise', '흩어진 학기 자료를, 확인 가능한 학기 정보로'],
    ['student-problem', '과제 정보는 흩어지고, 학생은 매번 다시 연결합니다'],
    ['product-flow', 'AY가 먼저 일하고, 학생이 마지막 결정을 합니다'],
    ['product-demo', '학생이 맡기고, AY가 일하고, 함께 확인합니다'],
    ['built-in-codex', 'Codex는 실행 엔진이고, AY-PLE가 제품입니다'],
    ['week-1', 'Agent 실행을 하나의 계약으로 반복해서 다룰 수 있는가?'],
    ['week-2', '공식 Codex SDK를 직접 재사용하면서, 메시지와 완료 순서를 보존할 수 있는가?'],
    ['closing', 'Codex가 제품은 아닙니다.'],
  ] as const

  for (const [index, [slideId, heading]] of mainSlides.entries()) {
    await page.getByRole('button', { name: `${index + 1}번 슬라이드` }).click()
    await expect(page).toHaveURL(new RegExp(`#${slideId}$`))
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
  }

  await page.getByRole('button', { name: '4번 슬라이드' }).click()
  await expect(
    page.getByRole('link', { name: '전체 화면 데모 시작 ↗' }),
  ).toHaveAttribute('href', 'product-flow/?step=1&present=1')

  await page.getByRole('button', { name: '3번 슬라이드' }).click()
  const productFlowSlide = page.locator('[data-slide-id="product-flow"]')
  await expect(productFlowSlide.getByText('자료를 선택합니다')).toBeVisible()
  await expect(
    productFlowSlide.getByText('일을 맡기고, AY의 작업을 봅니다'),
  ).toBeVisible()
  await expect(
    productFlowSlide.getByText('원본 근거와 변경 제안을 봅니다'),
  ).toBeVisible()
  await expect(
    productFlowSlide.getByText('사용자가 결정해 확인된 정보로 만듭니다'),
  ).toBeVisible()
  expect(
    await productFlowSlide.evaluate(
      (element) => getComputedStyle(element).wordBreak,
    ),
  ).toBe('keep-all')

  await page.getByRole('button', { name: '6번 슬라이드' }).click()
  await expect(page.getByText('본편에서는 정적 화면으로만 설명합니다')).toBeVisible()

  await page.getByRole('button', { name: '7번 슬라이드' }).click()
  const weekTwoSlide = page.locator('[data-slide-id="week-2"]')
  await expect(weekTwoSlide.getByText('공식 버전을 정확히 고정')).toBeVisible()
  await expect(weekTwoSlide.getByText('늦게 온 응답에도 순서 보존')).toBeVisible()
  await expect(weekTwoSlide.getByText('정확한 커밋에 고정')).toBeVisible()
  await expect(weekTwoSlide.getByText('실패 재현', { exact: true })).toBeVisible()
  await expect(weekTwoSlide.getByText('통과', { exact: true })).toBeVisible()
  await expect(weekTwoSlide.getByText('rust-v0.144.4', { exact: true })).toBeVisible()
  await expect(weekTwoSlide.getByText('구현·검증됨', { exact: true })).toBeVisible()
  await expect(weekTwoSlide.getByText(/Chat Shell · Node↔Python bridge/)).toBeVisible()

  await page.getByRole('button', { name: '8번 슬라이드' }).click()
  await expect(page.locator('#slideCounter')).toHaveText('8 / 8')
  await expect(page.getByRole('button', { name: '다음 슬라이드' })).toBeDisabled()
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/#closing$/)
  await expect(page.locator('[data-deck-section="appendix"]:visible')).toHaveCount(0)

  await page.getByRole('link', { name: /기술 부록 보기/ }).click()
  await expect(page).toHaveURL(/#appendix-runtime$/)
  await expect(page.locator('#slideCounter')).toHaveText('부록 1 / 3')
  await expect(page.locator('#slideDots button')).toHaveCount(3)
  await expect(
    page.getByRole('button', { name: '본편 마무리로 돌아가기' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', {
      name: 'Agent 실행을 하나의 계약으로 시작하고, 관찰하고, 기록합니다',
    }),
  ).toBeVisible()

  await page.getByRole('button', { name: '다음 슬라이드' }).click()
  await expect(page).toHaveURL(/#appendix-sdk$/)
  await expect(page.locator('#slideCounter')).toHaveText('부록 2 / 3')
  await expect(
    page.getByText('Chat Shell 구현 ≠ 학업 제품 연결', { exact: true }),
  ).toBeVisible()

  await page.getByRole('button', { name: '다음 슬라이드' }).click()
  await expect(page).toHaveURL(/#appendix-boundary$/)
  await expect(
    page.getByText('현재 실행 경로 ≠ 학업 제품 수직 흐름', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('구현됨 · product flow와는 분리')).toBeVisible()

  await page.getByRole('button', { name: '본편 마무리로 돌아가기' }).click()
  await expect(page).toHaveURL(/#closing$/)
  await expect(page.locator('#slideCounter')).toHaveText('8 / 8')

  await page.goto(`${demoUrl}/artifacts/camp-demo/#slide-5`)
  await expect(page).toHaveURL(/#built-in-codex$/)
  await expect(
    page.getByRole('heading', {
      name: 'Codex는 실행 엔진이고, AY-PLE가 제품입니다',
    }),
  ).toBeVisible()

  const fallbackResponse = await request.get(
    `${demoUrl}/artifacts/camp-demo/assets/runtime-inspector-completed.jpg`,
  )
  expect(fallbackResponse.ok()).toBeTruthy()
})

test('weekly progress keeps its handoff visible in a wide browser viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 920 })
  await page.goto(`${demoUrl}/artifacts/camp-demo/#week-1`)

  await expect(page.locator('[data-slide-id="week-1"] .week-handoff')).toBeInViewport({
    ratio: 1,
  })
})

test('the full deck fits both presentation viewports', async ({ page }) => {
  const slideIds = [
    'product-promise',
    'student-problem',
    'product-flow',
    'product-demo',
    'built-in-codex',
    'week-1',
    'week-2',
    'closing',
    'appendix-runtime',
    'appendix-sdk',
    'appendix-boundary',
  ]
  for (const viewport of presentationViewports) {
    await page.setViewportSize(viewport)

    for (const slideId of slideIds) {
      await page.goto(`${demoUrl}/artifacts/camp-demo/#${slideId}`)
      const bounds = await page
        .locator(`[data-slide-id="${slideId}"]`)
        .evaluate((element) => ({
          clientHeight: element.clientHeight,
          clientWidth: element.clientWidth,
          scrollHeight: element.scrollHeight,
          scrollWidth: element.scrollWidth,
        }))

      expect(bounds.scrollHeight, `${slideId} vertical overflow`).toBeLessThanOrEqual(
        bounds.clientHeight,
      )
      expect(bounds.scrollWidth, `${slideId} horizontal overflow`).toBeLessThanOrEqual(
        bounds.clientWidth,
      )
    }
  }
})

test('product flow keeps broadcast-readable type at presentation viewports', async ({
  page,
}) => {
  const readableType = [
    ['.source-copy strong', 14],
    ['.source-copy small', 12],
    ['.document-lines li', 13],
    ['.chat-bubble', 15],
    ['.chat-proposal-card .proposal-fields dd', 15],
    ['.proposal-revision-form textarea', 14],
    ['.chat-composer textarea', 14],
  ] as const

  for (const viewport of presentationViewports) {
    await page.setViewportSize(viewport)
    await page.goto(
      `${demoUrl}/artifacts/camp-demo/product-flow/?step=6&present=1`,
    )

    const fontSizes = await page.evaluate((selectors) => (
      Object.fromEntries(selectors.map((selector) => {
        const element = document.querySelector(selector)
        if (!element) throw new Error(`Missing readable type target: ${selector}`)
        return [selector, Number.parseFloat(getComputedStyle(element).fontSize)]
      }))
    ), readableType.map(([selector]) => selector))

    for (const [selector, minimumSize] of readableType) {
      const fontSize = fontSizes[selector]
      expect(fontSize, `${selector} at ${viewport.width}px`).toBeGreaterThanOrEqual(
        minimumSize,
      )
    }
  }
})

test('grounded evidence stays inside its panel after review CTA removal', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(
    `${demoUrl}/artifacts/camp-demo/product-flow/?step=5&present=1`,
  )

  const bounds = await page.evaluate(() => {
    const selectors = [
      '#evidencePanel',
      '.evidence-rows',
      '.document-status',
      '#documentWorkspace',
    ]

    return Object.fromEntries(selectors.map((selector) => {
      const element = document.querySelector(selector)
      if (!element) throw new Error(`Missing grounded layout target: ${selector}`)
      const rect = element.getBoundingClientRect()
      return [selector, { top: rect.top, bottom: rect.bottom }]
    }))
  })

  expect(bounds['#evidencePanel'].bottom, 'evidence overlaps status').toBeLessThanOrEqual(
    bounds['.document-status'].top + 0.5,
  )
  expect(bounds['.evidence-rows'].bottom, 'evidence content leaves its panel').toBeLessThanOrEqual(
    bounds['#evidencePanel'].bottom + 0.5,
  )
  expect(bounds['.document-status'].bottom, 'status leaves workspace').toBeLessThanOrEqual(
    bounds['#documentWorkspace'].bottom + 0.5,
  )
  await expect(page.locator('#reviewProposalButton')).toHaveCount(0)
})

test('camp demo product flow reaches confirmed state through explicit acceptance', async ({
  page,
}) => {
  await page.goto(
    `${demoUrl}/artifacts/camp-demo/product-flow/?step=1&present=1`,
  )

  await expect(
    page.getByRole('main', { name: 'AY-PLE 제품 데모' }),
  ).toBeVisible()
  await expect(page.locator('#footerStep')).toHaveText('1 / 7')
  await expect(
    page.getByRole('checkbox', { name: 'lms-outline-notice.txt 선택' }),
  ).not.toBeChecked()
  await expect(
    page.getByRole('checkbox', { name: 'problem-solving-syllabus.pdf 선택' }),
  ).not.toBeChecked()
  await expect(
    page.getByRole('button', { name: '✦ 선택한 자료 정리하기' }),
  ).toBeDisabled()
  await expect(page.locator('#chatEmpty')).toBeVisible()
  await expect(page.locator('#runRequestCard')).toBeHidden()
  await expect(page.locator('#chatInput')).toBeDisabled()

  await page.keyboard.press('r')
  await expect(page).toHaveURL(/\?step=1&present=1$/)
  await expect(page.locator('#footerStep')).toHaveText('1 / 7')

  await page
    .getByRole('checkbox', { name: 'lms-outline-notice.txt 선택' })
    .check()
  await page
    .getByRole('checkbox', { name: 'problem-solving-syllabus.pdf 선택' })
    .check()

  await page
    .getByRole('button', { name: '✦ 선택한 자료 정리하기' })
    .click()
  await page.locator('#resetButton').click()
  await expect(page.locator('#footerStep')).toHaveText('1 / 7')

  await page
    .getByRole('checkbox', { name: 'lms-outline-notice.txt 선택' })
    .check()
  await page
    .getByRole('checkbox', { name: 'problem-solving-syllabus.pdf 선택' })
    .check()

  await page
    .getByRole('button', { name: '✦ 선택한 자료 정리하기' })
    .click()
  await expect(page.locator('#chatEmpty')).toBeHidden()
  await expect(page.locator('#runRequestCard')).toBeVisible()
  await expect(page.locator('#runAcknowledgement')).toBeVisible()
  await expect(page.locator('#workspaceStageActions')).toHaveCount(0)
  await expect(page.locator('#showActivityButton')).toHaveCount(0)
  await page.locator('#nextButton').click()
  await expect(page.locator('#footerStep')).toHaveText('4 / 7')
  await expect(page.getByRole('region', { name: 'AY가 사용한 도구' })).toBeVisible()
  await expect(page.locator('#chatThread')).toContainText('TXT · LMS 과제 공지')
  await expect(page.locator('#chatThread')).toContainText('PDF · 강의계획서')
  expect(
    await page.locator('#chatThread').evaluate((element) => (
      [...element.children]
        .filter((child) => !child.hasAttribute('hidden'))
        .map((child) => child.id)
    )),
  ).toEqual(['runRequestCard', 'runAcknowledgement', 'toolCallStack'])

  await page
    .getByRole('tab', { name: 'problem-solving-syllabus.pdf' })
    .click()
  await page.getByRole('button', { name: '편집하기' }).click()
  await expect(
    page.getByRole('textbox', {
      name: 'problem-solving-syllabus.pdf 편집',
    }),
  ).toBeVisible()
  await page.getByRole('button', { name: '프리뷰 보기' }).click()

  await page.getByRole('button', { name: '다음 →' }).click()
  await expect(
    page.getByRole('region', { name: '선택 자료 근거' }),
  ).toBeVisible()
  await expect(page.locator('.evidence-bubble')).toBeVisible()
  await page.getByRole('button', { name: '근거를 확인했어요 · 제안 보기 →' }).click()
  await expect(page.locator('.evidence-bubble')).toBeHidden()
  await expect(page.locator('.accept-action:visible')).toHaveCount(1)

  await page.getByRole('button', { name: '수정 요청' }).click()
  await expect(page.locator('#proposalReadView')).toBeVisible()
  await expect(page.locator('#proposalRevisionForm')).toBeVisible()
  await expect(page.locator('#revisionPromptInput')).toBeFocused()
  await expect(page.locator('#chatInput')).toBeDisabled()
  await page.getByRole('button', { name: '과제 이름 정정 제안' }).click()
  await expect(page.locator('#revisionPromptInput')).toHaveValue(
    '과제 이름을 ‘문제해결글쓰기 개요 작성’으로 바꿔줘.',
  )
  await page.getByRole('button', { name: 'AY에게 수정 요청' }).click()
  await expect(page.locator('#proposalRevisionForm')).toBeHidden()
  await expect(page.locator('#proposalReadView')).toBeVisible()
  await expect(page.locator('#proposalRevisionState')).toBeVisible()
  await expect(page.locator('#proposalRevisionState')).toContainText(
    '과제 이름을 ‘문제해결글쓰기 개요 작성’으로 바꿔줘.',
  )
  await expect(page.locator('#proposalRevisionPending')).toBeVisible()
  await expect(page.locator('.accept-action:visible')).toHaveCount(0)
  await expect(page.locator('#proposalRevisionResponse')).toBeVisible()
  await expect(page.locator('#proposalRevisionPending')).toBeHidden()
  await expect(page.locator('#proposalTitle')).toHaveText('문제해결글쓰기 개요 작성')
  await expect(page.locator('#proposalStatus')).toHaveText('수정됨 · 내 확인 필요')
  await expect(page.getByRole('button', { name: '수정 요청' })).toBeHidden()
  await expect(page.locator('#chatInput')).toBeDisabled()
  await expect(page.locator('#chatInput')).toHaveAttribute(
    'placeholder',
    '제안 카드에서 AY에게 수정 요청을 보낼 수 있어요',
  )
  await page.getByRole('button', { name: '✓ 수락하고 반영' }).click()

  await expect(
    page.getByRole('heading', {
      name: '확인한 내용만 내 학기 정보가 됩니다',
    }),
  ).toBeVisible()
  await expect(page.getByText('반영 완료', { exact: true })).toBeVisible()
  await expect(page.locator('.evidence-bubble')).toBeHidden()
  await expect(
    page.locator('.success-bubble strong'),
  ).toHaveText('문제해결글쓰기 개요 작성')
  await expect(page.locator('#acceptedTitle')).toHaveText(
    '문제해결글쓰기 개요 작성',
  )
  await expect(page.locator('#decisionReceipt')).toBeVisible()
  await expect(page.locator('.success-bubble')).not.toContainText('`')
  await expect(
    page.getByRole('main', { name: 'AY-PLE 제품 데모' }),
  ).toBeVisible()

  await page.goto(`${demoUrl}/artifacts/camp-demo/product-flow/?step=1`)
  await expect(page.locator('#footerStep')).toHaveText('1 / 7')
  await expect(
    page.getByRole('heading', {
      name: '자료는 쌓이는데, 할 일은 흩어져 있습니다',
    }),
  ).toBeVisible()
  expect(
    await page.locator('#stageTitle').evaluate(
      (element) => getComputedStyle(element).wordBreak,
    ),
  ).toBe('keep-all')

  await page.goto(
    `${demoUrl}/artifacts/camp-demo/product-flow/?step=2&present=1`,
  )
  await expect(page.locator('#footerStep')).toHaveText('2 / 7')
  await page.locator('#resetButton').click()
  await expect(page.locator('#footerStep')).toHaveText('1 / 7')
})

test('product flow keeps direct acceptance and cancels stale inline revision', async ({
  page,
}) => {
  await page.goto(
    `${demoUrl}/artifacts/camp-demo/product-flow/?step=6&present=1`,
  )

  await page.getByRole('button', { name: '✓ 수락하고 반영' }).click()
  await expect(page.locator('#footerStep')).toHaveText('7 / 7')
  await expect(page.locator('#acceptedTitle')).toHaveText('개요 작성하기')
  await expect(page.locator('#decisionReceipt')).toContainText(
    '변경 제안을 수락했습니다.',
  )

  await page.goto(
    `${demoUrl}/artifacts/camp-demo/product-flow/?step=6&present=1`,
  )
  await page.getByRole('button', { name: '수정 요청' }).click()
  await page.getByRole('button', { name: '과제 이름 정정 제안' }).click()
  await page.getByRole('button', { name: 'AY에게 수정 요청' }).click()
  await expect(page.locator('#proposalRevisionPending')).toBeVisible()

  await page.locator('#resetButton').click()
  await expect(page.locator('#footerStep')).toHaveText('1 / 7')
  await expect(page.locator('#chatEmpty')).toBeVisible()
  await page.waitForTimeout(800)
  await expect(page.locator('#proposalRevisionState')).toBeHidden()
  await expect(page.locator('#proposalCard')).toBeHidden()
})

test('product flow fits presentation viewports with scroll-contained chat', async ({
  page,
}) => {
  const viewports = [
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]
  const steps = [1, 3, 4, 6, 7]

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)

    for (const step of steps) {
      await page.goto(
        `${demoUrl}/artifacts/camp-demo/product-flow/?step=${step}&present=1`,
      )
      const bounds = await page.evaluate(() => ({
        bodyHeight: document.body.scrollHeight,
        bodyWidth: document.body.scrollWidth,
        viewportHeight: document.documentElement.clientHeight,
        viewportWidth: document.documentElement.clientWidth,
      }))

      expect(
        bounds.bodyHeight,
        `step ${step} vertical overflow`,
      ).toBeLessThanOrEqual(bounds.viewportHeight)
      expect(
        bounds.bodyWidth,
        `step ${step} horizontal overflow`,
      ).toBeLessThanOrEqual(bounds.viewportWidth)

      if (step === 6) {
        await expect(
          page.getByRole('button', { name: '✓ 수락하고 반영' }),
        ).toBeInViewport()
      }
    }
  }
})
