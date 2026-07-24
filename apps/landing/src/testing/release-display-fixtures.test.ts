import type { LandingReleaseDisplay } from '../release-display.js'

export const validLandingReleaseDisplay = {
  schemaVersion: 1,
  release: {
    channel: 'public-preview',
    packageName: 'ay-ple',
    applicationVersion: '7.4.2-preview.fixture.3',
    applicationReleaseTag: 'v7.4.2-preview.fixture.3',
    exactCommand: 'npx ay-ple@7.4.2-preview.fixture.3',
  },
  runtime: {
    applicationVersion: '7.4.2-preview.fixture.3',
    releaseId: '9.1.0',
    firstDownloadBytes: 214_958_113,
    installedRegularBytes: 587_230_419,
    conservativeFreeSpaceBytes: 1_662_353_024,
    cacheDisplayLocation:
      '~/Library/Application Support/AY-PLE/runtime-cache/v1',
  },
  compatibility: {
    applicationVersion: '7.4.2-preview.fixture.3',
    platformLabel: 'Apple Silicon Mac',
    minimumMacosVersion: '13.5',
    nodeRange: '>=22.12 <23',
    npmRange: '>=10 <11',
    browsers: [
      { name: 'Google Chrome', minimumMajor: 142 },
      { name: 'Chromium', minimumMajor: 142 },
    ],
    networkLabels: ['npm registry', 'GitHub Releases', 'OpenAI Codex'],
    accountLabel: 'Codex를 사용할 수 있는 기존 ChatGPT account',
  },
  links: {
    applicationVersion: '7.4.2-preview.fixture.3',
    docs: {
      url: 'https://example.com/ay-ple-fixture/docs',
    },
    github: {
      url: 'https://example.com/ay-ple-fixture/source',
    },
    releaseEvidence: {
      url: 'https://example.com/ay-ple-fixture/releases/v7.4.2-preview.fixture.3',
    },
    privacy: {
      url: 'https://example.com/ay-ple-fixture/privacy',
    },
    security: {
      url: 'https://example.com/ay-ple-fixture/security',
    },
    license: {
      url: 'https://example.com/ay-ple-fixture/license',
    },
    notice: {
      url: 'https://example.com/ay-ple-fixture/notice',
    },
    thirdPartyNotices: {
      url: 'https://example.com/ay-ple-fixture/third-party-notices',
    },
  },
  rollback: null,
} as const satisfies LandingReleaseDisplay

export function landingReleaseDisplayWith(
  transform: (value: Record<string, unknown>) => void,
): unknown {
  const value = structuredClone(validLandingReleaseDisplay) as unknown as Record<
    string,
    unknown
  >
  transform(value)
  return value
}
