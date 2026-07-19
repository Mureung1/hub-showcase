import { expect } from 'playwright/test'

import { scenarioPrompts, test } from './chat-shell-harness.js'

test('selects exactly two registered TXT and reads each source in the center preview', async ({
  chatPage: page,
}) => {
  const materials = page.getByRole('complementary', { name: '학기 자료' })
  const preview = page.getByRole('main', { name: '자료 미리보기' })
  const chat = page.getByRole('complementary', { name: 'AY Chat' })

  await expect(materials).toBeVisible()
  await expect(preview).toBeVisible()
  await expect(chat).toBeVisible()
  await expect(materials.getByText('문제해결글쓰기', { exact: true })).toBeVisible()
  await expect(materials.getByText('0 / 2 선택됨', { exact: true })).toBeVisible()

  const notice = materials.getByRole('checkbox', {
    name: 'lms-outline-notice.txt 선택',
  })
  const syllabus = materials.getByRole('checkbox', {
    name: 'problem-solving-syllabus.txt 선택',
  })
  const negative = materials.getByRole('checkbox', {
    name: 'unselected-control.txt 선택',
  })
  await notice.check()
  await syllabus.check()

  await expect(materials.getByText('2 / 2 선택됨', { exact: true })).toBeVisible()
  await expect(notice).toBeChecked()
  await expect(syllabus).toBeChecked()
  await expect(negative).not.toBeChecked()
  await expect(negative).toBeDisabled()
  await expect(preview.getByRole('tab', { name: 'lms-outline-notice.txt' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(
    preview.getByText('개요 작성하기 과제 마감은', { exact: false }),
  ).toBeVisible()

  await preview
    .getByRole('tab', { name: 'problem-solving-syllabus.txt' })
    .click()
  await expect(
    preview.getByText('제출 방식: LMS 과제함 업로드', { exact: false }),
  ).toBeVisible()
  await expect(page.locator('body')).not.toContainText(
    'ay-ple-first-assignment-e2e-',
  )
})

test.describe('toggleable AY Chat companion', () => {
  test.use({ scenario: 'interrupt-follow-up' })

  test('keeps the mounted conversation and active stream while hidden', async ({
    chatHarness,
    chatPage: page,
  }) => {
    await page.getByRole('button', { name: '새 대화' }).click()
    await expect(page.getByText('thread-native-interrupt-follow-up', { exact: true })).toBeVisible()
    await page
      .getByRole('textbox', { name: '메시지', exact: true })
      .fill(scenarioPrompts['interrupt-follow-up'])
    await page.getByRole('button', { name: '메시지 보내기' }).click()
    await expect(page.locator('[data-conversation-phase]')).toHaveAttribute(
      'data-conversation-phase',
      'running',
    )

    await page.getByRole('button', { name: 'AY Chat 숨기기' }).click()
    await expect(
      page.getByRole('complementary', { name: 'AY Chat' }),
    ).toBeHidden()
    expect(chatHarness.calls().map((call) => call.operation)).toEqual([
      'startThread',
      'startTurn',
    ])

    await page.getByRole('button', { name: 'AY Chat 열기' }).click()
    await expect(
      page.getByRole('complementary', { name: 'AY Chat' }),
    ).toBeVisible()
    await expect(page.getByText('thread-native-interrupt-follow-up', { exact: true })).toBeVisible()
    await expect(
      page.getByText('중단 전까지 작성한 답변입니다.', { exact: true }),
    ).toBeVisible()
    await page.getByRole('button', { name: '답변 중단' }).click()
    await expect(page.getByText('답변이 중단됐어요', { exact: true })).toBeVisible()
  })
})

test('keeps desktop panes distinct and exposes keyboard-visible source controls', async ({
  chatPage: page,
}) => {
  const materials = page.getByRole('complementary', { name: '학기 자료' })
  const preview = page.getByRole('main', { name: '자료 미리보기' })
  const chat = page.getByRole('complementary', { name: 'AY Chat' })
  const [materialsBox, previewBox, chatBox] = await Promise.all([
    materials.boundingBox(),
    preview.boundingBox(),
    chat.boundingBox(),
  ])
  assertBox(materialsBox)
  assertBox(previewBox)
  assertBox(chatBox)
  expect(materialsBox.x + materialsBox.width).toBeLessThanOrEqual(previewBox.x)
  expect(previewBox.x + previewBox.width).toBeLessThanOrEqual(chatBox.x)

  await page.setViewportSize({ width: 1920, height: 1080 })
  const [wideMaterialsBox, widePreviewBox, wideChatBox] = await Promise.all([
    materials.boundingBox(),
    preview.boundingBox(),
    chat.boundingBox(),
  ])
  assertBox(wideMaterialsBox)
  assertBox(widePreviewBox)
  assertBox(wideChatBox)
  expect(wideMaterialsBox.x + wideMaterialsBox.width).toBeLessThanOrEqual(
    widePreviewBox.x,
  )
  expect(widePreviewBox.x + widePreviewBox.width).toBeLessThanOrEqual(
    wideChatBox.x,
  )

  const firstMaterial = materials.getByRole('checkbox').first()
  await firstMaterial.focus()
  await expect(firstMaterial).toBeFocused()
  expect(await firstMaterial.evaluate((element) => element.matches(':focus-visible'))).toBe(true)
  await page.keyboard.press('Space')
  await expect(firstMaterial).toBeChecked()
})

test('distinguishes product loading, inactive workspace, no Course, empty materials, and Server failure', async ({
  chatHarness,
  page,
}) => {
  let mode: 'pending' | 'inactive' | 'empty' | 'error' = 'pending'
  let releaseBootstrap: (() => void) | undefined
  const bootstrapGate = new Promise<void>((resolve) => {
    releaseBootstrap = resolve
  })
  await page.route('**/api/product/bootstrap', async (route) => {
    if (mode === 'pending') await bootstrapGate
    if (mode === 'error') {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'test_product_failure',
          displayMessage: '학기 작업공간을 확인하지 못했습니다.',
        }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        workspace:
          mode === 'inactive'
            ? null
            : {
                state: 'ready',
                storeFormatVersion: 1,
                confirmedRevision: 0,
                course: null,
                materials: [],
              },
      }),
    })
  })

  await page.goto(chatHarness.url)
  await expect(
    page.getByText('학기 작업공간을 불러오는 중입니다.', { exact: true }),
  ).toBeVisible()

  mode = 'inactive'
  releaseBootstrap?.()
  await expect(
    page.getByText('학기 폴더를 선택해 주세요', { exact: true }),
  ).toBeVisible()

  mode = 'empty'
  await page.reload()
  await expect(page.getByText('과목이 아직 없습니다', { exact: true })).toBeVisible()
  await expect(
    page.getByText('등록할 수 있는 TXT 자료가 없습니다', { exact: true }),
  ).toBeVisible()

  mode = 'error'
  await page.reload()
  await expect(
    page.getByText('학기 작업공간을 불러오지 못했습니다', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('test_product_failure')).toHaveCount(0)
})

function assertBox(
  box: { readonly x: number; readonly y: number; readonly width: number; readonly height: number } | null,
): asserts box is { x: number; y: number; width: number; height: number } {
  expect(box).not.toBeNull()
}
