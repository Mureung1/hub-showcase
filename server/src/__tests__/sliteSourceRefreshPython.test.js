import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const REPOSITORY_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

test(
  'SL-SOURCE Python refresh, migration, restart, and corruption contracts pass',
  { timeout: 120_000 },
  () => {
    const result = spawnSync(
      process.env.NOTICEPILOT_PYTHON || 'python3',
      [
        '-B',
        '-m',
        'unittest',
        'discover',
        '-s',
        'server/python',
        '-p',
        'test_slite_source_refresh.py',
        '-v',
      ],
      {
        cwd: REPOSITORY_ROOT,
        encoding: 'utf8',
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
        timeout: 110_000,
      },
    )
    assert.equal(result.error, undefined, result.error?.message)
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
  },
)
