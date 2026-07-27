import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { expect, test } from 'playwright/test'
import {
  createServer as createViteServer,
  type ViteDevServer,
} from 'vite'

const chatShellRoot = fileURLToPath(new URL('../', import.meta.url))
let server: ViteDevServer
let targetUrl: string

test.beforeAll(async () => {
  server = await createViteServer({
    configFile: false,
    root: chatShellRoot,
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: false,
    },
  })
  await server.listen()
  const origin = server.resolvedUrls?.local[0]
  if (!origin) throw new Error('Workspace lifecycle Vite URL is missing')
  targetUrl = new URL('/e2e/workspace-lifecycle-target.html', origin).href
})

test.afterAll(async () => {
  await server.close()
})

test('projects only starting, active, and honest path-free recovery states at desktop width', async ({
  page,
}) => {
  const scenarios = [
    ['starting', 'starting', '2학년 1학기 작업공간을 여는 중입니다'],
    ['active', 'active', '2학년 1학기 작업공간이 준비되었습니다'],
    [
      'workspace-unavailable',
      'recovery_required',
      '등록된 학기 작업공간을 열 수 없습니다',
    ],
    [
      'runtime-unavailable',
      'recovery_required',
      'AY Runtime을 계속 사용할 수 없습니다',
    ],
    [
      'registry-incompatible',
      'recovery_required',
      'WorkspaceRegistry를 확인해야 합니다',
    ],
    [
      'prepared-workspace-required',
      'recovery_required',
      '준비된 학기 작업공간이 필요합니다',
    ],
    ['failed-switch', 'active', '2학년 2학기 작업공간이 준비되었습니다'],
  ] as const

  for (const [scenario, state, heading] of scenarios) {
    await page.goto(`${targetUrl}?scenario=${scenario}`)
    const surface = page.locator('[data-workspace-lifecycle]')
    await expect(surface).toHaveAttribute('data-workspace-lifecycle', state)
    await expect(
      page.getByRole(
        state === 'recovery_required' ? 'alert' : 'status',
        { name: 'AY 작업공간 상태' },
      ),
    ).toContainText(heading)
    await expect(page.getByRole('button')).toHaveCount(0)
    await expect(page.getByText('/private/semester')).toHaveCount(0)
  }

  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto(`${targetUrl}?scenario=active`)
  await expect(page.locator('[data-workspace-lifecycle]')).toBeVisible()
  await expect(page.getByRole('button')).toHaveCount(0)
})
