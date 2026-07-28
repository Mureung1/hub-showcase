import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import type { VerifiedProductionBundle } from './production-bundle.js'
import {
  decodeNativeContextInitialize,
} from './native-context-probe-protocol.js'
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
  readonly mcpServers?: unknown
  readonly omitMarkers?: boolean
  readonly omitInstructions?: boolean
} = {}): Record<string, unknown> {
  return {
    config: {
      model: 'private-model',
      ...(Object.hasOwn(input, 'mcpServers')
        ? { mcp_servers: input.mcpServers }
        : {}),
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
  readonly shortDescription?: unknown
  readonly interface?: unknown
  readonly dependencies?: unknown
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
    ...(Object.hasOwn(input, 'shortDescription')
      ? { shortDescription: input.shortDescription }
      : {}),
    ...(Object.hasOwn(input, 'interface')
      ? { interface: input.interface }
      : {}),
    ...(Object.hasOwn(input, 'dependencies')
      ? { dependencies: input.dependencies }
      : {}),
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

test('accepts only the exact pinned initialize response', async (t) => {
  const valid = {
    codexHome: '/controlled/codex-home',
    platformFamily: 'unix',
    platformOs: 'macos',
    userAgent: 'codex_cli_rs/0.144.4',
  }

  assert.doesNotThrow(() =>
    decodeNativeContextInitialize(valid, '/controlled/codex-home'),
  )

  const cases: Array<[string, unknown]> = [
    [
      'missing user agent',
      {
        codexHome: valid.codexHome,
        platformFamily: valid.platformFamily,
        platformOs: valid.platformOs,
      },
    ],
    [
      'legacy server info',
      { ...valid, serverInfo: { name: 'codex', version: '0.144.4' } },
    ],
    ['wrong Codex home', { ...valid, codexHome: '/other/home' }],
    ['relative Codex home', { ...valid, codexHome: 'codex-home' }],
    ['nullable platform family', { ...valid, platformFamily: null }],
    ['non-string platform OS', { ...valid, platformOs: 144 }],
    ['control character user agent', { ...valid, userAgent: 'bad\nagent' }],
  ]
  for (const [name, value] of cases) {
    await t.test(name, () => {
      assert.throws(
        () =>
          decodeNativeContextInitialize(
            value,
            '/controlled/codex-home',
          ),
        /invalid initialize response/,
      )
    })
  }
})

test('projects and freezes only the high-level effective config', () => {
  const projected = nativeContextProbeTesting.decodeConfigResult(
    configResult({
      markers: ['.git', '.hg'],
      instructions: '/private/tmp/AGENTS.md',
      mcpServers: {
        ignored_server: {
          args: null,
          command: null,
          cwd: null,
          enabled: false,
          env: null,
          env_vars: null,
          future_transport_field: 'capability-neutral',
          required: false,
          tool_timeout_sec: null,
        },
        ay_ple_interaction: {
          args: ['adapter.mjs', '--stdio'],
          command: '../bin/node',
          cwd: '/private/tmp/ay-ple-semester',
          enabled: true,
          enabled_tools: ['propose_state_patch'],
          disabled_tools: ['unsafe_tool'],
          env: {
            AY_PLE_STATIC_MODE: 'review',
          },
          env_vars: [
            'AY_PLE_INTERACTION_BROKER_URL',
            {
              name: 'AY_PLE_INTERACTION_BROKER_TOKEN',
              source: 'local',
            },
          ],
          required: true,
          tool_timeout_sec: 300,
        },
      },
    }),
  )

  assert.deepEqual(projected, {
    projectRootMarkers: ['.git', '.hg'],
    globalInstructionsFile: '/private/tmp/AGENTS.md',
    mcpServers: [
      {
        name: 'ay_ple_interaction',
        command: '../bin/node',
        args: ['adapter.mjs', '--stdio'],
        envVars: [
          {
            name: 'AY_PLE_INTERACTION_BROKER_URL',
            source: null,
          },
          {
            name: 'AY_PLE_INTERACTION_BROKER_TOKEN',
            source: 'local',
          },
        ],
        cwd: '/private/tmp/ay-ple-semester',
        toolTimeoutSec: 300,
        env: {
          AY_PLE_STATIC_MODE: 'review',
        },
        enabled: true,
        required: true,
        enabledTools: ['propose_state_patch'],
        disabledTools: ['unsafe_tool'],
      },
      {
        name: 'ignored_server',
        command: null,
        args: [],
        envVars: [],
        cwd: null,
        toolTimeoutSec: null,
        env: {},
        enabled: false,
        required: false,
        enabledTools: null,
        disabledTools: [],
      },
    ],
  })
  assert.equal(Object.isFrozen(projected), true)
  assert.equal(Object.isFrozen(projected.projectRootMarkers), true)
  assert.equal(Object.isFrozen(projected.mcpServers), true)
  assert.equal(Object.isFrozen(projected.mcpServers[0]), true)
  assert.equal(Object.isFrozen(projected.mcpServers[0]?.args), true)
  assert.equal(Object.isFrozen(projected.mcpServers[0]?.envVars), true)
  assert.equal(Object.isFrozen(projected.mcpServers[0]?.envVars[0]), true)
  assert.equal(Object.isFrozen(projected.mcpServers[0]?.env), true)
  assert.equal(Object.isFrozen(projected.mcpServers[0]?.enabledTools), true)
  assert.equal(Object.isFrozen(projected.mcpServers[0]?.disabledTools), true)
  assert.equal(Object.hasOwn(projected, 'model'), false)

  const nativeDefault = nativeContextProbeTesting.decodeConfigResult(
    configResult({ markers: null }),
  )
  assert.deepEqual(nativeDefault, {
    projectRootMarkers: ['.git'],
    globalInstructionsFile: null,
    mcpServers: [],
  })
  assert.equal(Object.isFrozen(nativeDefault.projectRootMarkers), true)
  assert.equal(Object.isFrozen(nativeDefault.mcpServers), true)
})

test('rejects missing, malformed, or unbounded native config fields', async (t) => {
  const cases: Array<[string, unknown]> = [
    ['missing markers', configResult({ omitMarkers: true })],
    ['missing instructions', configResult({ omitInstructions: true })],
    ['non-array markers', configResult({ markers: 42 })],
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
      'non-object MCP declarations',
      configResult({ mcpServers: [] }),
    ],
    [
      'non-boolean MCP required flag',
      configResult({
        mcpServers: {
          ay_ple_interaction: {
            required: 'true',
          },
        },
      }),
    ],
    [
      'malformed MCP command',
      configResult({
        mcpServers: {
          server: {
            command: 42,
          },
        },
      }),
    ],
    [
      'control character MCP command',
      configResult({
        mcpServers: {
          server: {
            command: 'node\n--inspect',
          },
        },
      }),
    ],
    [
      'oversized MCP command',
      configResult({
        mcpServers: {
          server: {
            command: 'x'.repeat(16 * 1024 + 1),
          },
        },
      }),
    ],
    [
      'unbounded MCP args',
      configResult({
        mcpServers: {
          server: {
            args: Array.from({ length: 129 }, () => 'argument'),
          },
        },
      }),
    ],
    [
      'malformed MCP arg',
      configResult({
        mcpServers: {
          server: {
            args: ['argument', 42],
          },
        },
      }),
    ],
    [
      'unsupported inherited MCP environment source',
      configResult({
        mcpServers: {
          server: {
            env_vars: [
              {
                name: 'TOKEN',
                source: 'unsupported',
              },
            ],
          },
        },
      }),
    ],
    [
      'control character inherited MCP environment variable',
      configResult({
        mcpServers: {
          server: {
            env_vars: ['BAD\nTOKEN'],
          },
        },
      }),
    ],
    [
      'malformed MCP cwd',
      configResult({
        mcpServers: {
          server: {
            cwd: false,
          },
        },
      }),
    ],
    [
      'non-positive MCP tool timeout',
      configResult({
        mcpServers: {
          server: {
            tool_timeout_sec: 0,
          },
        },
      }),
    ],
    [
      'non-finite MCP tool timeout',
      configResult({
        mcpServers: {
          server: {
            tool_timeout_sec: Number.POSITIVE_INFINITY,
          },
        },
      }),
    ],
    [
      'unbounded static MCP environment',
      configResult({
        mcpServers: {
          server: {
            env: Object.fromEntries(
              Array.from({ length: 129 }, (_, index) => [
                `KEY_${index}`,
                'value',
              ]),
            ),
          },
        },
      }),
    ],
    [
      'non-string static MCP environment value',
      configResult({
        mcpServers: {
          server: {
            env: {
              TOKEN: 42,
            },
          },
        },
      }),
    ],
    [
      'control character static MCP environment value',
      configResult({
        mcpServers: {
          server: {
            env: {
              TOKEN: 'bad\nvalue',
            },
          },
        },
      }),
    ],
    [
      'oversized static MCP environment value',
      configResult({
        mcpServers: {
          server: {
            env: {
              TOKEN: 'x'.repeat(16 * 1024 + 1),
            },
          },
        },
      }),
    ],
    [
      'malformed enabled MCP tool roster',
      configResult({
        mcpServers: {
          ay_ple_interaction: {
            enabled_tools: ['propose_state_patch', 42],
          },
        },
      }),
    ],
    [
      'malformed disabled MCP tool roster',
      configResult({
        mcpServers: {
          ay_ple_interaction: {
            disabled_tools: ['propose_state_patch', 42],
          },
        },
      }),
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
          shortDescription: null,
          interface: {
            brandColor: '#32b5a4',
            defaultPrompt: null,
            displayName: 'Assignment',
            iconLarge: null,
            iconSmall: '/managed/assets/assignment-small.png',
            shortDescription: 'Review an assignment',
          },
          dependencies: {
            tools: [
              {
                command: null,
                description: 'Calendar connector',
                transport: 'mcp',
                type: 'mcp',
                url: null,
                value: 'calendar',
              },
            ],
          },
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
    [
      'dependencies missing tools',
      skillsResult({
        skills: [skill({ dependencies: {} })],
      }),
    ],
    [
      'dependencies unexpected field',
      skillsResult({
        skills: [
          skill({
            dependencies: {
              tools: [],
              privateField: true,
            },
          }),
        ],
      }),
    ],
    [
      'malformed dependency tool',
      skillsResult({
        skills: [
          skill({
            dependencies: {
              tools: [{ type: 'mcp' }],
            },
          }),
        ],
      }),
    ],
    [
      'dependency tool malformed optional field',
      skillsResult({
        skills: [
          skill({
            dependencies: {
              tools: [
                {
                  description: 144,
                  type: 'mcp',
                  value: 'calendar',
                },
              ],
            },
          }),
        ],
      }),
    ],
    [
      'dependency tool unexpected field',
      skillsResult({
        skills: [
          skill({
            dependencies: {
              tools: [
                {
                  type: 'mcp',
                  value: 'calendar',
                  privateField: true,
                },
              ],
            },
          }),
        ],
      }),
    ],
    [
      'interface unexpected field',
      skillsResult({
        skills: [
          skill({
            interface: {
              displayName: 'Assignment',
              privateField: true,
            },
          }),
        ],
      }),
    ],
    [
      'interface malformed icon',
      skillsResult({
        skills: [
          skill({
            interface: {
              iconSmall: 'relative/icon.png',
            },
          }),
        ],
      }),
    ],
    [
      'interface malformed display name',
      skillsResult({
        skills: [
          skill({
            interface: {
              displayName: 144,
            },
          }),
        ],
      }),
    ],
    [
      'interface explicitly undefined field',
      skillsResult({
        skills: [
          skill({
            interface: {
              displayName: undefined,
            },
          }),
        ],
      }),
    ],
    [
      'system Skill malformed nested metadata',
      skillsResult({
        skills: [
          skill({
            scope: 'system',
            dependencies: {
              tools: [{ type: 'mcp' }],
            },
          }),
        ],
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
