import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import type { VerifiedProductionBundle } from './production-bundle.js'
import {
  nativeContextProbeTesting,
} from './native-context-probe.js'

const WORKSPACE = '/private/tmp/ay-ple-semester'

const BUNDLE: VerifiedProductionBundle = {
  bridgeEntrypoint: '/runtime/bridge.py',
  codexPathDirectory: '/runtime/codex-path',
  nativeExecutable: '/runtime/bin/codex',
  patchStackSha256: 'patch-stack',
  pythonBuild: 'python-build',
  pythonExecutable: '/runtime/bin/python',
  pythonVersion: '3.10.18',
  runtimeBinaryVersion: 'codex-cli 0.144.4',
  runtimeVersion: '0.144.4',
  sitePackages: '/runtime/site-packages',
  sourceCommit: 'source-commit',
}

function configResult(input: {
  readonly markers?: unknown
  readonly instructions?: unknown
  readonly omitMarkers?: boolean
  readonly omitInstructions?: boolean
} = {}): Record<string, unknown> {
  return {
    config: {
      model: 'private-model',
      ...(input.omitMarkers
        ? {}
        : {
            project_root_markers: Object.hasOwn(input, 'markers')
              ? input.markers
              : [],
          }),
      ...(input.omitInstructions
        ? {}
        : {
            model_instructions_file: Object.hasOwn(input, 'instructions')
              ? input.instructions
              : null,
          }),
    },
    layers: [],
    origins: {},
  }
}

function skill(input: {
  readonly name?: unknown
  readonly enabled?: unknown
  readonly path?: unknown
  readonly scope?: unknown
} = {}): Record<string, unknown> {
  return {
    description: 'description',
    enabled: input.enabled ?? true,
    name: input.name ?? 'assignment',
    path:
      input.path ??
      path.join(
        WORKSPACE,
        '.agents',
        'skills',
        'assignment',
        'SKILL.md',
      ),
    scope: input.scope ?? 'repo',
  }
}

function skillsResult(input: {
  readonly cwd?: unknown
  readonly errors?: unknown
  readonly skills?: unknown
} = {}): Record<string, unknown> {
  return {
    data: [
      {
        cwd: input.cwd ?? WORKSPACE,
        errors: input.errors ?? [],
        skills: Object.hasOwn(input, 'skills')
          ? input.skills
          : [skill()],
      },
    ],
  }
}

test('resolves the exact manifest-attested native App Server command', () => {
  assert.deepEqual(
    nativeContextProbeTesting.resolveCommand(BUNDLE, undefined),
    [
      '/runtime/bin/codex',
      '--config',
      'project_root_markers=[]',
      'app-server',
      '--listen',
      'stdio://',
    ],
  )
  assert.deepEqual(
    nativeContextProbeTesting.resolveCommand(BUNDLE, [
      '/usr/bin/node',
      '/fixture/fake.mjs',
    ]),
    ['/usr/bin/node', '/fixture/fake.mjs'],
  )
})

test('projects and freezes only the high-level effective config', () => {
  const projected = nativeContextProbeTesting.decodeConfigResult(
    configResult({
      markers: ['.git', '.hg'],
      instructions: '/private/tmp/AGENTS.md',
    }),
  )

  assert.deepEqual(projected, {
    projectRootMarkers: ['.git', '.hg'],
    globalInstructionsFile: '/private/tmp/AGENTS.md',
  })
  assert.equal(Object.isFrozen(projected), true)
  assert.equal(Object.isFrozen(projected.projectRootMarkers), true)
  assert.equal(Object.hasOwn(projected, 'model'), false)
})

test('rejects missing, malformed, or unbounded native config fields', async (t) => {
  const cases: Array<[string, unknown]> = [
    ['missing markers', configResult({ omitMarkers: true })],
    ['missing instructions', configResult({ omitInstructions: true })],
    ['non-array markers', configResult({ markers: null })],
    [
      'too many markers',
      configResult({ markers: Array.from({ length: 1025 }, () => '.git') }),
    ],
    ['empty marker', configResult({ markers: [''] })],
    ['control marker', configResult({ markers: ['bad\nmarker'] })],
    [
      'oversized marker',
      configResult({ markers: ['x'.repeat(1025)] }),
    ],
    [
      'relative instruction path',
      configResult({ instructions: 'AGENTS.md' }),
    ],
    [
      'unnormalized instruction path',
      configResult({ instructions: '/private/tmp/../AGENTS.md' }),
    ],
    [
      'unexpected response key',
      { ...configResult(), privateField: true },
    ],
  ]
  for (const [name, value] of cases) {
    await t.test(name, () => {
      assert.throws(
        () => nativeContextProbeTesting.decodeConfigResult(value),
        /invalid config\/read response/,
      )
    })
  }
})

test('validates every Skill scope and omits only system entries', () => {
  const projected = nativeContextProbeTesting.decodeSkillsResult(
    skillsResult({
      skills: [
        skill({
          name: 'system-skill',
          path: '/runtime/system/system-skill/SKILL.md',
          scope: 'system',
        }),
        skill({
          name: 'repo-skill',
          path: path.join(
            WORKSPACE,
            '.agents',
            'skills',
            'repo-skill',
            'SKILL.md',
          ),
          scope: 'repo',
        }),
        skill({
          name: 'user-skill',
          path: '/controlled/home/.agents/skills/user-skill/SKILL.md',
          scope: 'user',
        }),
        skill({
          name: 'admin-skill',
          path: '/managed/admin/admin-skill/SKILL.md',
          scope: 'admin',
        }),
      ],
    }),
    WORKSPACE,
  )

  assert.deepEqual(projected, [
    {
      name: 'repo-skill',
      enabled: true,
      sourceRoot: path.join(
        WORKSPACE,
        '.agents',
        'skills',
        'repo-skill',
      ),
    },
    {
      name: 'user-skill',
      enabled: true,
      sourceRoot: '/controlled/home/.agents/skills/user-skill',
    },
    {
      name: 'admin-skill',
      enabled: true,
      sourceRoot: '/managed/admin/admin-skill',
    },
  ])
  assert.equal(Object.isFrozen(projected), true)
  assert.equal(projected.every(Object.isFrozen), true)
})

test('rejects Skill response drift before projection', async (t) => {
  const cases: Array<[string, unknown]> = [
    ['wrong cwd', skillsResult({ cwd: '/wrong' })],
    ['native errors', skillsResult({ errors: [{ message: 'private' }] })],
    ['invalid catalog', skillsResult({ skills: null })],
    ['empty name', skillsResult({ skills: [skill({ name: '' })] })],
    [
      'relative path',
      skillsResult({ skills: [skill({ path: 'assignment/SKILL.md' })] }),
    ],
    [
      'wrong basename',
      skillsResult({ skills: [skill({ path: '/skills/README.md' })] }),
    ],
    [
      'unknown scope',
      skillsResult({ skills: [skill({ scope: 'unknown' })] }),
    ],
    [
      'unexpected Skill field',
      skillsResult({
        skills: [{ ...skill(), privateField: 'must-not-cross' }],
      }),
    ],
    ['extra data entry', { data: [{}, {}] }],
  ]
  for (const [name, value] of cases) {
    await t.test(name, () => {
      assert.throws(
        () =>
          nativeContextProbeTesting.decodeSkillsResult(value, WORKSPACE),
        /invalid skills\/list response/,
      )
    })
  }
})
