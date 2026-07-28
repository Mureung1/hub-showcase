import { createHash } from 'node:crypto'
import {
  mkdir,
  mkdtemp,
  realpath,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createServer as createNodeServer } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type {
  AnswerUserInput,
  CancelUserInput,
  CodexChatRuntimeError,
  CodexProductActivity,
  CodexProductTurn,
  CodexWorkspaceRuntime,
  InterruptTurnInput,
  ReleaseThreadInput,
  StartProductTurnInput,
  StartTurnInput,
} from '@ay-ple/codex-chat-runtime'
import type { ProductWorkspaceLifecycle } from '@ay-ple/product-contract'
import react from '@vitejs/plugin-react'
import { expect, test, type Page } from 'playwright/test'
import {
  createServer as createViteServer,
  type ViteDevServer,
} from 'vite'

import { createPreparedServerApplication } from '../../server/src/prepared-server-application.js'
import { bindServerApplicationListener } from '../../server/src/server-listener.js'
import { codexChatIdentity } from '../../server/src/testing/codex-chat-test-support.js'

const chatShellRoot = fileURLToPath(new URL('../', import.meta.url))

test('prepared Browser invokes model_semester beside AY Chat and settles inline Semantic Review', async ({
  page,
}) => {
  const browserPort = await availablePort()
  const browserOrigin = `http://127.0.0.1:${browserPort}`
  const workspaceRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), 'prepared-public-browser-')),
  )
  const evidenceQuote = '마감은 8월 3일입니다.'
  const evidenceText =
    `초기 안내: ${evidenceQuote}\n` +
    `강의계획서 안내: ${evidenceQuote} LMS에서 제출해 주세요.`
  const evidenceDigest = createHash('sha256')
    .update(evidenceText)
    .digest('hex')
  const lateEvidenceQuote = 'AY가 새로 만든 요약 자료입니다.'
  const lateEvidenceText = `${lateEvidenceQuote}\n검토 후 제출해 주세요.`
  const lateEvidenceDigest = createHash('sha256')
    .update(lateEvidenceText)
    .digest('hex')
  await writeFile(path.join(workspaceRoot, 'assignment.txt'), evidenceText)
  await writeFile(
    path.join(workspaceRoot, 'syllabus.txt'),
    '학기 정보 정리 순서를 확인합니다.',
  )
  const limitPaths = Array.from(
    { length: 15 },
    (_, index) => `limits/source-${String(index + 1).padStart(2, '0')}.txt`,
  )
  await Promise.all(
    limitPaths.map(async (relativePath) => {
      const absolutePath = path.join(workspaceRoot, relativePath)
      await mkdir(path.dirname(absolutePath), { recursive: true })
      await writeFile(absolutePath, relativePath)
    }),
  )
  const lecturePdf = onePagePdf()
  await writeFile(path.join(workspaceRoot, 'lecture.pdf'), lecturePdf)
  await writeFile(path.join(workspaceRoot, 'broken.pdf'), 'not a PDF')
  await writeFile(path.join(workspaceRoot, 'slides.pptx'), 'unsupported preview')
  const skillRoot = path.join(
    workspaceRoot,
    '.agents',
    'skills',
    'ay-ple-semester-modeling',
  )
  await mkdir(skillRoot, { recursive: true })
  await writeFile(
    path.join(skillRoot, 'SKILL.md'),
    '# AY-PLE First Assignment\n',
  )
  const runtime = new PreparedBrowserRuntime(skillRoot)
  let lifecycle: ProductWorkspaceLifecycle = {
    state: 'active',
    workspace: {
      workspaceId: 'workspace_0123456789abcdef0123456789abcdef',
      semester: {
        yearLevel: 2,
        term: { key: 'fall', displayName: '2학기' },
      },
      label: '2학년 2학기',
    },
  }
  const target = await createPreparedServerApplication({
    codexChat: {
      ...codexChatIdentity,
      origin: browserOrigin,
      createRuntime: async () => runtime,
      acquireProductThread: async (actualRuntime) =>
        (await actualRuntime.startThread()).threadId,
    },
    workspaceRoot,
    readLifecycle: () => lifecycle,
  })
  const listener = await bindServerApplicationListener({
    host: '127.0.0.1',
    port: 0,
    requestHandler: target.application.app,
  })
  const apiUrl = `http://127.0.0.1:${listener.port}`
  let vite: ViteDevServer | undefined
  let lifecycleReader:
    | ReadableStreamDefaultReader<Uint8Array>
    | undefined
  try {
    vite = await createViteServer({
      appType: 'spa',
      configFile: false,
      root: chatShellRoot,
      plugins: [react()],
      server: {
        hmr: false,
        host: '127.0.0.1',
        port: browserPort,
        strictPort: true,
        proxy: { '/api': { target: apiUrl } },
      },
    })
    await vite.listen()
    const url = vite.resolvedUrls?.local[0]
    if (!url) throw new Error('Prepared Browser URL is missing')
    await page.goto(url)
    let actionRequestCount = 0
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/product/actions') {
        actionRequestCount += 1
      }
    })

    await expect(page.getByRole('complementary', { name: 'AY Chat' })).toBeVisible()
    await expect(page.getByText('2학년 2학기', { exact: true })).toBeVisible()
    const sources = page.getByRole('complementary', { name: '학기 자료' })
    await expect(sources).toBeVisible()
    await expect(
      page.getByRole('main', { name: '자료 미리보기' }),
    ).toBeVisible()
    await expectThreePaneLayout(page)
    const modelSemester = sources.getByRole('button', {
      name: '선택한 자료로 학기 정보 정리하기 · 0개',
    })
    const assignmentSelection = sources.getByRole('checkbox', {
      name: 'assignment.txt 학기 정보 정리 자료 선택',
    })
    const syllabusSelection = sources.getByRole('checkbox', {
      name: 'syllabus.txt 학기 정보 정리 자료 선택',
    })
    await expect(modelSemester).toBeDisabled()
    await expect(assignmentSelection).not.toBeChecked()
    await sources
      .getByRole('button', { name: 'assignment.txt 미리보기' })
      .click()
    await expect(assignmentSelection).not.toBeChecked()
    await expect(page.getByLabel('assignment.txt 원문')).toContainText(
      evidenceQuote,
    )
    await syllabusSelection.check()
    await expect(page.getByLabel('assignment.txt 원문')).toContainText(
      evidenceQuote,
    )
    await assignmentSelection.check()
    await expect(assignmentSelection).toBeChecked()
    await expect(syllabusSelection).toBeChecked()
    await expect(
      sources.getByRole('button', {
        name: '선택한 자료로 학기 정보 정리하기 · 2개',
      }),
    ).toBeEnabled()
    for (const relativePath of limitPaths.slice(0, 14)) {
      await sources
        .getByRole('checkbox', {
          name: `${relativePath} 학기 정보 정리 자료 선택`,
        })
        .check()
    }
    await expect(
      sources.getByRole('button', {
        name: '선택한 자료로 학기 정보 정리하기 · 16개',
      }),
    ).toBeEnabled()
    await expect(assignmentSelection).toBeEnabled()
    await expect(
      sources.getByRole('checkbox', {
        name:
          `${limitPaths[14]} 학기 정보 정리 자료 선택 불가: ` +
          '자료는 최대 16개까지 선택할 수 있습니다.',
      }),
    ).toBeDisabled()
    expect(actionRequestCount).toBe(0)
    for (const relativePath of limitPaths.slice(0, 14)) {
      await sources
        .getByRole('checkbox', {
          name: `${relativePath} 학기 정보 정리 자료 선택`,
        })
        .uncheck()
    }
    await expect(
      sources.getByRole('button', {
        name: '선택한 자료로 학기 정보 정리하기 · 2개',
      }),
    ).toBeEnabled()
    const lectureSelection = sources.getByRole('checkbox', {
      name: 'lecture.pdf 학기 정보 정리 자료 선택',
    })
    const slidesSelection = sources.getByRole('checkbox', {
      name: 'slides.pptx 학기 정보 정리 자료 선택',
    })
    await expect(lectureSelection).toBeEnabled()
    await expect(slidesSelection).toBeEnabled()
    await lectureSelection.check()
    await slidesSelection.check()
    await expect(
      sources.getByRole('button', {
        name: '선택한 자료로 학기 정보 정리하기 · 4개',
      }),
    ).toBeEnabled()
    await expect(page.locator('.paper-preview')).not.toHaveAttribute(
      'aria-live',
      'polite',
    )
    const lecturePdfRequests: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (
        url.pathname === '/api/product/sources/pdf' &&
        url.searchParams.get('relativePath') === 'lecture.pdf'
      ) {
        lecturePdfRequests.push(request.url())
      }
    })
    const pdfLoaded = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return (
        url.pathname === '/api/product/sources/pdf' &&
        url.searchParams.get('relativePath') === 'lecture.pdf'
      )
    })
    await sources
      .getByRole('button', { name: 'lecture.pdf 미리보기' })
      .click()
    const pdfResponse = await pdfLoaded
    expect(pdfResponse.status()).toBe(200)
    expect(pdfResponse.headers()['content-type']).toBe('application/pdf')
    expect(pdfResponse.headers()['content-security-policy']).toContain(
      'sandbox',
    )
    expect(Number(pdfResponse.headers()['content-length'])).toBe(
      lecturePdf.byteLength,
    )
    const pdfFrame = page.getByLabel('lecture.pdf PDF 미리보기')
    await expect(pdfFrame).toBeVisible()
    await expect(pdfFrame).toHaveAttribute(
      'src',
      /\/api\/product\/sources\/pdf\?relativePath=lecture\.pdf/u,
    )
    expect(lecturePdfRequests).toHaveLength(1)
    await writeFile(path.join(workspaceRoot, 'lecture.pdf'), 'not a PDF')
    const invalidPdfReloaded = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return (
        url.pathname === '/api/product/sources/pdf' &&
        url.searchParams.get('relativePath') === 'lecture.pdf'
      )
    })
    await sources
      .getByRole('button', { name: 'lecture.pdf 미리보기' })
      .click()
    expect((await invalidPdfReloaded).status()).toBe(415)
    expect(lecturePdfRequests).toHaveLength(2)
    await expect(page.getByText('원문을 열지 못했습니다')).toBeVisible()
    await writeFile(path.join(workspaceRoot, 'lecture.pdf'), lecturePdf)
    const recoveredPdfReloaded = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return (
        url.pathname === '/api/product/sources/pdf' &&
        url.searchParams.get('relativePath') === 'lecture.pdf'
      )
    })
    await sources
      .getByRole('button', { name: 'lecture.pdf 미리보기' })
      .click()
    expect((await recoveredPdfReloaded).status()).toBe(200)
    await expect(page.getByLabel('lecture.pdf PDF 미리보기')).toBeVisible()
    expect(lecturePdfRequests).toHaveLength(3)
    await sources
      .getByRole('button', { name: 'broken.pdf 미리보기' })
      .click()
    await expect(page.getByText('원문을 열지 못했습니다')).toBeVisible()
    await expect(page.getByLabel('broken.pdf PDF 미리보기')).toHaveCount(0)
    await sources
      .getByRole('button', { name: 'slides.pptx 미리보기' })
      .click()
    await expect(page.getByText('이 형식은 앱에서 미리볼 수 없습니다')).toBeVisible()
    await page.getByRole('button', { name: 'AY Chat 숨기기' }).click()
    await expect(
      page.getByRole('complementary', { name: 'AY Chat' }),
    ).toBeHidden()
    await page.getByRole('button', { name: 'AY Chat 열기' }).click()
    await expect(
      page.getByRole('complementary', { name: 'AY Chat' }),
    ).toBeVisible()
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expectThreePaneLayout(page)
    await expect(page.getByText('과목을 준비해 주세요')).toHaveCount(0)
    await expect(page.getByLabel('Fast mode')).toBeDisabled()
    await page.getByLabel('Codex 모델').selectOption('gpt-fast')
    await page.getByLabel('추론 강도').selectOption('high')
    await page.getByLabel('Fast mode').check()
    await page.getByRole('button', { name: 'AY Chat 숨기기' }).click()
    const actionRequest = page.waitForRequest((request) => {
      const url = new URL(request.url())
      return (
        request.method() === 'POST' &&
        url.pathname === '/api/product/actions'
      )
    })
    await sources
      .getByRole('button', {
        name: '선택한 자료로 학기 정보 정리하기 · 4개',
      })
      .click()
    await expect(
      page.getByRole('complementary', { name: 'AY Chat' }),
    ).toBeVisible()
    expect((await actionRequest).postDataJSON()).toEqual({
      action: 'model_semester',
      files: [
        { relativePath: 'assignment.txt' },
        { relativePath: 'lecture.pdf' },
        { relativePath: 'slides.pptx' },
        { relativePath: 'syllabus.txt' },
      ],
      codexSettings: {
        model: 'gpt-fast',
        reasoningEffort: 'high',
        serviceTier: 'fast',
      },
    })
    expect(actionRequestCount).toBe(1)
    const actionEntry = page.locator('.product-transcript-row.is-action')
    await expect(actionEntry).toContainText('선택한 자료로 학기 정보 정리하기')
    await expect(actionEntry).toContainText('assignment.txt')
    await expect(actionEntry).toContainText('lecture.pdf')
    await expect(actionEntry).toContainText('slides.pptx')
    await expect(actionEntry).toContainText('syllabus.txt')
    await expect(actionEntry).not.toContainText('나')
    await expect(page.getByText('workspace를 확인했습니다.')).toBeVisible()
    expect(runtime.startThreadCalls).toBe(1)
    expect(runtime.productInputs[0]?.permissionProfile).toBe('workspace_write')
    expect(runtime.productInputs[0]?.settings).toEqual({
      model: 'gpt-fast',
      reasoningEffort: 'high',
      serviceTier: 'fast',
    })
    expect(runtime.productInputs[0]?.text).toBe(
      [
        'ActionInvocation: model_semester',
        'Selected SemesterWorkspace file references:',
        '- [assignment.txt](assignment.txt)',
        '- [lecture.pdf](lecture.pdf)',
        '- [slides.pptx](slides.pptx)',
        '- [syllabus.txt](syllabus.txt)',
      ].join('\n'),
    )
    expect(runtime.productInputs[0]?.skill).toEqual({
      name: 'ay-ple-semester-modeling',
      path: path.join(
        workspaceRoot,
        '.agents',
        'skills',
        'ay-ple-semester-modeling',
        'SKILL.md',
      ),
    })
    await expect(
      sources.getByRole('checkbox', {
        name:
          'assignment.txt 학기 정보 정리 자료 선택 불가: ' +
          'AY 작업 중에는 선택을 바꿀 수 없습니다.',
      }),
    ).toBeDisabled()
    await expect(
      sources.getByRole('button', {
        name: '선택한 자료로 학기 정보 정리하기 · 4개',
      }),
    ).toBeDisabled()
    await expect(
      page.getByRole('textbox', { name: '메시지', exact: true }),
    ).toBeDisabled()
    await sources
      .getByRole('button', { name: 'assignment.txt 미리보기' })
      .click()
    await expect(page.getByLabel('assignment.txt 원문')).toContainText(
      evidenceQuote,
    )
    await unlink(path.join(workspaceRoot, 'syllabus.txt'))
    const selectedReload = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.pathname === '/api/product/sources'
    })
    await sources
      .getByRole('button', { name: '자료 다시 불러오기' })
      .click()
    await selectedReload
    await expect(
      sources.getByRole('button', {
        name: '선택한 자료로 학기 정보 정리하기 · 3개',
      }),
    ).toBeDisabled()
    await expect(
      sources.getByRole('button', { name: 'syllabus.txt 미리보기' }),
    ).toHaveCount(0)
    await expect(actionEntry).toContainText('syllabus.txt')
    expect(actionRequestCount).toBe(1)
    const activeBootstrap = (await (
      await fetch(`${apiUrl}/api/product/bootstrap`)
    ).json()) as {
      readonly activeOperation: {
        readonly operationId: string
      } | null
    }
    const operationId = activeBootstrap.activeOperation?.operationId
    if (!operationId) throw new Error('Active product operation is missing')
    expect(operationId).toMatch(/^operation_[0-9a-f]{32}$/u)

    const clarification = page.getByRole('region', { name: 'AY 질문' })
    await expect(clarification).toContainText('학기 확인')
    await page.getByRole('button', { name: 'AY Chat 숨기기' }).click()
    await expect(
      page.getByRole('complementary', { name: 'AY Chat' }),
    ).toBeHidden()
    await page.getByRole('button', { name: 'AY Chat 열기' }).click()
    await expect(clarification).toContainText('학기 확인')
    await clarification.getByRole('textbox').fill('2학기')
    const answerRequest = page.waitForRequest((request) =>
      request.url().endsWith('/answer'),
    )
    await clarification.getByRole('button', { name: '답변' }).click()
    expect(new URL((await answerRequest).url()).pathname).toContain(
      `/operations/${operationId}/`,
    )
    await expect(
      page.getByRole('region', { name: '질문 응답 완료' }),
    ).toContainText('학기 확인')
    expect(runtime.answers).toEqual([
      {
        interactionId: 'native-interaction',
        answers: { 'native-question': ['2학기'] },
      },
    ])

    const headers = {
      authorization: `Bearer ${target.credentials.token}`,
      'content-type': 'application/json',
      'x-ay-ple-runtime-binding': target.credentials.binding,
    }
    expect(
      (
        await fetch(`${apiUrl}/api/_private/interaction-mcp/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            protocolVersion: 1,
            kind: 'handshake',
            serverName: 'ay_ple_interaction',
            capabilities: ['propose_state_patch'],
          }),
        })
      ).status,
    ).toBe(200)
    const lifecycleResponse = await fetch(
      `${apiUrl}/api/_private/interaction-mcp/`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          protocolVersion: 1,
          kind: 'lifecycle_open',
        }),
      },
    )
    expect(lifecycleResponse.status).toBe(200)
    if (!lifecycleResponse.body) {
      throw new Error('Adapter lifecycle response is missing')
    }
    lifecycleReader = lifecycleResponse.body.getReader()
    const lifecycleAccepted = await lifecycleReader.read()
    expect(lifecycleAccepted.done).toBe(false)
    expect(
      JSON.parse(new TextDecoder().decode(lifecycleAccepted.value)),
    ).toEqual({
      protocolVersion: 1,
      kind: 'lifecycle_accepted',
    })
    await expect(
      sources.getByRole('button', {
        name: 'generated-summary.txt 미리보기',
      }),
    ).toHaveCount(0)
    await writeFile(
      path.join(workspaceRoot, 'generated-summary.txt'),
      lateEvidenceText,
    )
    const held = fetch(`${apiUrl}/api/_private/interaction-mcp/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        protocolVersion: 1,
        kind: 'capability_call',
        capability: 'propose_state_patch',
        request: {
          summary: '과제 파일 변경',
          question: '이 변경을 반영할까요?',
          changes: [
            {
              label: '마감',
              description: '마감 정보를 actual file에 반영합니다.',
              before: '미정',
              after: '8월 3일',
              evidence: [
                {
                  relativePath: 'assignment.txt',
                  contentDigest: evidenceDigest,
                  locator: {
                    type: 'text_quote',
                    quote: evidenceQuote,
                    occurrence: 2,
                  },
                },
              ],
            },
            {
              label: '새 요약 자료',
              description: 'AY가 방금 만든 actual file을 검토합니다.',
              before: '없음',
              after: 'generated-summary.txt',
              evidence: [
                {
                  relativePath: 'generated-summary.txt',
                  contentDigest: lateEvidenceDigest,
                  locator: {
                    type: 'text_quote',
                    quote: lateEvidenceQuote,
                    occurrence: 1,
                  },
                },
              ],
            },
          ],
        },
      }),
    })
    const card = page.getByRole('region', { name: '검토 대기' })
    await expect(card).toContainText('과제 파일 변경')
    const evidence = card
      .locator('figure.semantic-evidence')
      .filter({ hasText: 'assignment.txt' })
    const lateEvidence = card
      .locator('figure.semantic-evidence')
      .filter({ hasText: 'generated-summary.txt' })
    await expect(evidence).toContainText('assignment.txt')
    await expect(evidence).toContainText('occurrence 2')
    await expect(evidence).toContainText(`SHA-256 ${evidenceDigest}`)
    await expect(evidence.locator('blockquote')).toContainText(
      '강의계획서 안내:',
    )
    await expect(evidence.locator('mark')).toHaveText(evidenceQuote)
    await expect(evidence.locator('blockquote')).toContainText(
      'LMS에서 제출해 주세요.',
    )
    await expect(lateEvidence).toContainText('generated-summary.txt')
    const refreshedList = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.pathname === '/api/product/sources'
    })
    const lateEvidenceRead = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return (
        url.pathname === '/api/product/sources/text' &&
        url.searchParams.get('relativePath') === 'generated-summary.txt'
      )
    })
    await lateEvidence
      .getByRole('button', { name: 'generated-summary.txt 근거 열기' })
      .click()
    await refreshedList
    await lateEvidenceRead
    await expect(
      sources.getByRole('button', {
        name: 'generated-summary.txt 미리보기',
      }),
    ).toBeVisible()
    await expect(
      page.getByLabel('generated-summary.txt 원문'),
    ).toContainText(lateEvidenceText)
    await expect(page.getByLabel('선택한 원문 근거')).toHaveText(
      lateEvidenceQuote,
    )
    await sources
      .getByRole('button', { name: 'assignment.txt 미리보기' })
      .click()
    await expect(page.getByLabel('assignment.txt 원문')).toContainText(
      evidenceText,
    )
    await writeFile(
      path.join(workspaceRoot, 'assignment.txt'),
      `${evidenceText}\n파일이 변경되었습니다.`,
    )
    const driftRead = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return (
        url.pathname === '/api/product/sources/text' &&
        url.searchParams.get('relativePath') === 'assignment.txt'
      )
    })
    await evidence
      .getByRole('button', { name: 'assignment.txt 근거 열기' })
      .click()
    await driftRead
    await expect(
      page.getByText(
        '검토 근거와 현재 파일의 내용이 달라 근거 위치를 표시하지 못했습니다.',
      ),
    ).toBeVisible()
    await expect(page.getByLabel('선택한 원문 근거')).toHaveCount(0)
    await writeFile(
      path.join(workspaceRoot, 'assignment.txt'),
      evidenceText,
    )
    const restoredRead = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return (
        url.pathname === '/api/product/sources/text' &&
        url.searchParams.get('relativePath') === 'assignment.txt'
      )
    })
    await evidence
      .getByRole('button', { name: 'assignment.txt 근거 열기' })
      .click()
    await restoredRead
    const focusedEvidence = page.getByLabel('선택한 원문 근거')
    await expect(focusedEvidence).toHaveText(evidenceQuote)
    expect(
      await focusedEvidence.evaluate((element) =>
        element.previousSibling?.textContent?.endsWith(
          '강의계획서 안내: ',
        ),
      ),
    ).toBe(true)
    await card.getByRole('button', { name: '수락' }).click()
    const heldResponse = await held
    expect(heldResponse.status).toBe(200)
    expect(await heldResponse.json()).toMatchObject({
      kind: 'capability_result',
      result: { outcome: 'accept' },
    })
    const settledCard = page.getByRole('region', { name: '수락됨' })
    await expect(settledCard).toContainText('과제 파일 변경')
    await expect(
      settledCard.getByRole('button', { name: '수락' }),
    ).toHaveCount(0)
    await expect(
      settledCard.getByRole('button', { name: '수정 요청' }),
    ).toHaveCount(0)
    await expect(
      settledCard.getByRole('button', { name: '거절' }),
    ).toHaveCount(0)

    const reviseHeld = fetch(`${apiUrl}/api/_private/interaction-mcp/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        protocolVersion: 1,
        kind: 'capability_call',
        capability: 'propose_state_patch',
        request: {
          summary: '과제 파일 변경 보완',
          question: '보완한 변경을 반영할까요?',
          changes: [
            {
              label: '제출 방식',
              description: '제출 방식을 actual file에 반영합니다.',
              before: '미정',
              after: 'LMS',
            },
          ],
        },
      }),
    })
    const reviseCard = page.getByRole('region', { name: '검토 대기' })
    await expect(reviseCard).toContainText('과제 파일 변경 보완')
    await reviseCard.getByRole('button', { name: '수정 요청' }).click()
    await reviseCard
      .getByRole('textbox', { name: '수정 요청' })
      .fill('제출 위치를 더 구체적으로 적어 줘.')
    await reviseCard.getByRole('button', { name: '수정 요청' }).click()
    expect(await (await reviseHeld).json()).toMatchObject({
      kind: 'capability_result',
      result: {
        outcome: 'revise',
        feedback: '제출 위치를 더 구체적으로 적어 줘.',
      },
    })
    await expect(
      page.getByRole('region', { name: '수정 요청됨' }),
    ).toContainText('과제 파일 변경 보완')

    const rejectHeld = fetch(`${apiUrl}/api/_private/interaction-mcp/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        protocolVersion: 1,
        kind: 'capability_call',
        capability: 'propose_state_patch',
        request: {
          summary: '불필요한 과제 파일 변경',
          question: '이 변경을 반영할까요?',
          changes: [
            {
              label: '메모',
              description: '불필요한 메모를 추가합니다.',
              after: '임시 메모',
            },
          ],
        },
      }),
    })
    const rejectCard = page.getByRole('region', { name: '검토 대기' })
    await expect(rejectCard).toContainText('불필요한 과제 파일 변경')
    await rejectCard.getByRole('button', { name: '거절' }).click()
    expect(await (await rejectHeld).json()).toMatchObject({
      kind: 'capability_result',
      result: { outcome: 'reject' },
    })
    await expect(page.getByRole('region', { name: '거절됨' })).toContainText(
      '불필요한 과제 파일 변경',
    )

    const interruptRequest = page.waitForRequest((request) =>
      request.url().endsWith('/interrupt'),
    )
    await page.getByRole('button', { name: '작업 중단' }).click()
    expect(new URL((await interruptRequest).url()).pathname).toBe(
      `/api/product/operations/${operationId}/interrupt`,
    )
    await expect(page.locator('[data-product-operation-phase]')).toHaveAttribute(
      'data-product-operation-phase',
      'interrupted',
    )
    expect(runtime.interrupts).toHaveLength(1)
    const retainedAction = sources.getByRole('button', {
      name: '선택한 자료로 학기 정보 정리하기 · 3개',
    })
    await expect(retainedAction).toBeEnabled()
    await expect(assignmentSelection).toBeChecked()

    await unlink(path.join(workspaceRoot, 'assignment.txt'))
    const staleActionRequest = page.waitForRequest((request) => {
      const url = new URL(request.url())
      return url.pathname === '/api/product/actions'
    })
    await retainedAction.click()
    await staleActionRequest
    await expect(
      page.getByText(
        '선택한 자료가 변경되었습니다. 자료를 다시 확인해 주세요.',
      ),
    ).toBeVisible()
    await expect(page.locator('[data-product-operation-phase]')).toHaveAttribute(
      'data-product-operation-phase',
      'failed',
    )
    await expect(page.locator('[data-product-operation-phase]')).toHaveText(
      '실패',
    )
    expect(actionRequestCount).toBe(2)
    expect(runtime.productInputs).toHaveLength(1)
    await expect(assignmentSelection).toBeChecked()
    await expect(retainedAction).toBeEnabled()

    await writeFile(path.join(workspaceRoot, 'assignment.txt'), evidenceText)
    const retryActionRequest = page.waitForRequest((request) => {
      const url = new URL(request.url())
      return url.pathname === '/api/product/actions'
    })
    await retainedAction.click()
    expect((await retryActionRequest).postDataJSON()).toEqual({
      action: 'model_semester',
      files: [
        { relativePath: 'assignment.txt' },
        { relativePath: 'lecture.pdf' },
        { relativePath: 'slides.pptx' },
      ],
      codexSettings: {
        model: 'gpt-fast',
        reasoningEffort: 'high',
        serviceTier: 'fast',
      },
    })
    await expect(page.getByText('재실행한 학기 정보 정리를 완료하지 못했습니다.')).toBeVisible()
    await expect(page.locator('[data-product-operation-phase]')).toHaveAttribute(
      'data-product-operation-phase',
      'failed',
    )
    expect(actionRequestCount).toBe(3)
    expect(runtime.productInputs).toHaveLength(2)
    await expect(assignmentSelection).toBeChecked()
    await expect(retainedAction).toBeEnabled()
    await expect(page.locator('.product-transcript-row.is-action')).toHaveCount(
      3,
    )
    const chatRequest = page.waitForRequest((request) => {
      const url = new URL(request.url())
      return url.pathname === '/api/product/chat/messages'
    })
    await page
      .getByRole('textbox', { name: '메시지', exact: true })
      .fill('선택과 무관한 일반 질문입니다.')
    await page.getByRole('button', { name: '메시지 보내기' }).click()
    expect((await chatRequest).postDataJSON()).toEqual({
      text: '선택과 무관한 일반 질문입니다.',
      codexSettings: {
        model: 'gpt-fast',
        reasoningEffort: 'high',
        serviceTier: 'fast',
      },
    })
    await expect(page.getByText('일반 Chat을 완료했습니다.')).toBeVisible()
    expect(runtime.productInputs).toHaveLength(3)
    expect(runtime.productInputs[2]?.text).toBe(
      '선택과 무관한 일반 질문입니다.',
    )
    expect(Object.hasOwn(runtime.productInputs[2] ?? {}, 'skill')).toBe(false)
    expect(actionRequestCount).toBe(3)
    await expect(assignmentSelection).toBeChecked()
    await expect(retainedAction).toBeEnabled()
    lifecycle = {
      state: 'recovery_required',
      workspace: {
        availability: 'available',
        workspaceId: 'workspace_0123456789abcdef0123456789abcdef',
        semester: {
          yearLevel: 2,
          term: { key: 'fall', displayName: '2학기' },
        },
        label: '2학년 2학기',
      },
      reason: 'runtime_unavailable',
      displayMessage: 'AY Runtime을 다시 시작해 주세요.',
    }
    await expect(page.getByText('AY Runtime을 다시 시작해 주세요.')).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'AY Chat' })).toHaveCount(0)
  } finally {
    runtime.finish()
    await vite?.close()
    await target.application.close()
    if (lifecycleReader) {
      expect((await lifecycleReader.read()).done).toBe(true)
    }
    await listener.close({ signal: new AbortController().signal })
    await rm(workspaceRoot, { force: true, recursive: true })
  }
})

class PreparedBrowserRuntime implements CodexWorkspaceRuntime {
  readonly terminal = new Promise<CodexChatRuntimeError>(() => undefined)
  startThreadCalls = 0
  readonly productInputs: StartProductTurnInput[] = []
  readonly answers: AnswerUserInput[] = []
  readonly interrupts: InterruptTurnInput[] = []
  private readonly clarificationGate = deferred<void>()
  private readonly gate = deferred<void>()
  private interrupted = false

  constructor(private readonly skillRoot: string) {}

  readAccountReadiness() {
    return Promise.resolve({ state: 'ready' as const })
  }

  readModelCatalog() {
    return Promise.resolve({
      models: [
        {
          model: 'gpt-current',
          displayName: 'GPT Current',
          description: 'Current model',
          isDefault: true,
          defaultReasoningEffort: 'medium',
          supportedReasoningEfforts: [
            { reasoningEffort: 'medium', description: 'Balanced' },
          ],
          serviceTiers: ['default'],
        },
        {
          model: 'gpt-fast',
          displayName: 'GPT Fast',
          description: 'Fast model',
          isDefault: false,
          defaultReasoningEffort: 'low',
          supportedReasoningEfforts: [
            { reasoningEffort: 'low', description: 'Quick' },
            { reasoningEffort: 'high', description: 'Deep' },
          ],
          serviceTiers: ['default', 'fast'],
        },
      ],
    })
  }

  async startThread() {
    this.startThreadCalls += 1
    return { threadId: 'thread-prepared-browser' }
  }

  async startProductTurn(
    input: StartProductTurnInput,
  ): Promise<CodexProductTurn> {
    this.productInputs.push(structuredClone(input))
    if (input.skill === undefined) {
      return {
        threadId: input.threadId,
        turnId: 'turn-prepared-browser-chat',
        events: (async function* (): AsyncIterable<CodexProductActivity> {
          yield {
            type: 'agent_message.completed',
            threadId: input.threadId,
            turnId: 'turn-prepared-browser-chat',
            itemId: 'item-prepared-browser-chat',
            text: '일반 Chat을 완료했습니다.',
          }
          yield {
            type: 'turn.completed',
            threadId: input.threadId,
            turnId: 'turn-prepared-browser-chat',
            status: 'completed',
          }
        })(),
      }
    }
    const isRetry = this.productInputs.length > 1
    if (isRetry) {
      return {
        threadId: input.threadId,
        turnId: 'turn-prepared-browser-retry',
        events: (async function* (): AsyncIterable<CodexProductActivity> {
          yield {
            type: 'turn.error',
            threadId: input.threadId,
            turnId: 'turn-prepared-browser-retry',
            willRetry: false,
            code: 'turn_error',
            displayMessage: '재실행한 학기 정보 정리를 완료하지 못했습니다.',
          }
          yield {
            type: 'turn.completed',
            threadId: input.threadId,
            turnId: 'turn-prepared-browser-retry',
            status: 'failed',
            failure: {
              code: 'turn_error',
              displayMessage: '재실행한 학기 정보 정리를 완료하지 못했습니다.',
            },
          }
        })(),
      }
    }
    const clarificationGate = this.clarificationGate.promise
    const turnGate = this.gate.promise
    const wasInterrupted = () => this.interrupted
    return {
      threadId: input.threadId,
      turnId: 'turn-prepared-browser',
      events: (async function* (): AsyncIterable<CodexProductActivity> {
        yield {
          type: 'agent_message.completed',
          threadId: input.threadId,
          turnId: 'turn-prepared-browser',
          itemId: 'item-prepared-browser',
          text: 'workspace를 확인했습니다.',
        }
        yield {
          type: 'user_input.requested',
          threadId: input.threadId,
          turnId: 'turn-prepared-browser',
          itemId: 'item-clarification',
          interactionId: 'native-interaction',
          questions: [
            {
              id: 'native-question',
              header: '학기 확인',
              question: '어느 학기를 기준으로 할까요?',
              options: null,
              acceptsFreeform: true,
            },
          ],
        }
        await clarificationGate
        yield {
          type: 'user_input.resolved',
          threadId: input.threadId,
          turnId: 'turn-prepared-browser',
          itemId: 'item-clarification',
          interactionId: 'native-interaction',
          resolution: 'answered',
        }
        await turnGate
        yield {
          type: 'turn.completed',
          threadId: input.threadId,
          turnId: 'turn-prepared-browser',
          status: wasInterrupted() ? 'interrupted' : 'completed',
        }
      })(),
    }
  }

  finish() {
    this.gate.resolve(undefined)
  }

  startTurn(_input: StartTurnInput): Promise<never> {
    return Promise.reject(new Error('legacy turn is not expected'))
  }

  answerUserInput(input: AnswerUserInput) {
    this.answers.push(structuredClone(input))
    this.clarificationGate.resolve(undefined)
    return Promise.resolve()
  }

  cancelUserInput(_input: CancelUserInput) {
    this.clarificationGate.resolve(undefined)
    return Promise.resolve()
  }

  interrupt(input: InterruptTurnInput) {
    this.interrupted = true
    this.interrupts.push(structuredClone(input))
    this.finish()
    return Promise.resolve()
  }

  releaseThread(_input: ReleaseThreadInput) {
    return Promise.resolve()
  }

  readEffectiveConfig() {
    return Promise.resolve({
      projectRootMarkers: [],
      globalInstructionsFile: null,
      mcpServers: [],
    })
  }

  listEffectiveSkills() {
    return Promise.resolve([
      {
        name: 'ay-ple-semester-modeling',
        enabled: true,
        sourceRoot: this.skillRoot,
      },
    ])
  }

  close() {
    this.finish()
    return Promise.resolve()
  }
}

function deferred<T>(): {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

function onePagePdf(): Buffer {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>',
    '<< /Length 0 >>\nstream\n\nendstream',
  ]
  let body = '%PDF-1.4\n'
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(body))
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  }
  const xrefOffset = Buffer.byteLength(body)
  body += `xref\n0 ${objects.length + 1}\n`
  body += '0000000000 65535 f \n'
  for (const offset of offsets.slice(1)) {
    body += `${String(offset).padStart(10, '0')} 00000 n \n`
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`
  body += `startxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(body)
}

async function availablePort(): Promise<number> {
  const server = createNodeServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Ephemeral Browser port is missing')
  }
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
  return address.port
}

async function expectThreePaneLayout(page: Page): Promise<void> {
  const explorerBox = await page
    .getByRole('complementary', { name: '학기 자료' })
    .boundingBox()
  const previewBox = await page
    .getByRole('main', { name: '자료 미리보기' })
    .boundingBox()
  const chatBox = await page
    .getByRole('complementary', { name: 'AY Chat' })
    .boundingBox()
  if (!explorerBox || !previewBox || !chatBox) {
    throw new Error('Prepared three-pane layout boxes are missing')
  }
  expect(explorerBox.x + explorerBox.width).toBeLessThanOrEqual(
    previewBox.x + 1,
  )
  expect(previewBox.x + previewBox.width).toBeLessThanOrEqual(
    chatBox.x + 1,
  )
}
